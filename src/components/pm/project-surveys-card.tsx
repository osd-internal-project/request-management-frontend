"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ProjectSurveysView, SiteSurveyView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import {
  dropDraft,
  listDrafts,
  putDraft,
  type DraftPhoto,
  type SurveyDraft,
} from "@/lib/survey-drafts";

const m = messages.projects.surveys;

const mapHref = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

/** The device's position, or null when it cannot be read. */
function position(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (where) =>
        resolve({
          latitude: Number(where.coords.latitude.toFixed(6)),
          longitude: Number(where.coords.longitude.toFixed(6)),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/**
 * CD-210 — the site survey, made on a phone where there may be no signal:
 * the draft and its photos stay on the device (IndexedDB) until synced, and
 * the Solution's assumptions are checked one by one; one that does not hold
 * becomes a change request before the survey can be completed.
 */
export function ProjectSurveysCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectSurveysView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [drafts, setDrafts] = useState<SurveyDraft[]>([]);
  const [editing, setEditing] = useState<SurveyDraft | null>(null);
  const [online, setOnline] = useState(true);
  const [stored, setStored] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/surveys`;
  const photoHref = (surveyId: string, photoId: string) =>
    `/api/app/${base}/${surveyId}/photos/${photoId}`;

  const reload = useCallback(async () => {
    setDrafts(await listDrafts(projectId));
  }, [projectId]);

  /** Send one draft, then its photos; what was sent leaves the device. */
  const syncOne = useCallback(
    async (draft: SurveyDraft): Promise<string | null> => {
      const response = await appApi(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          site: draft.site,
          surveyed_on: draft.surveyedOn,
          latitude: draft.latitude,
          longitude: draft.longitude,
          summary: draft.summary,
          assumptions: Object.entries(draft.answers).map(([index, row]) => ({
            index: Number(index),
            holds: row.holds,
            note: row.note,
          })),
        }),
      });
      if (!response.ok) return response.message;
      let left = draft.photos;
      for (const photo of draft.photos) {
        const form = new FormData();
        form.append("id", photo.id);
        form.append("caption", photo.caption);
        if (photo.latitude !== null) {
          form.append("latitude", String(photo.latitude));
        }
        if (photo.longitude !== null) {
          form.append("longitude", String(photo.longitude));
        }
        form.append("taken_at", photo.takenAt);
        form.append("file", photo.blob, photo.name);
        const sent = await appApi(`${base}/${draft.id}/photos`, {
          method: "POST",
          body: form,
        });
        if (!sent.ok) {
          await putDraft({ ...draft, synced: true, photos: left });
          return sent.message;
        }
        left = left.filter((row) => row.id !== photo.id);
      }
      await dropDraft(draft.id);
      return null;
    },
    [base],
  );

  const syncAll = useCallback(
    async (rows: SurveyDraft[]) => {
      if (!rows.length) return;
      setBusy(true);
      setError(null);
      const failed: string[] = [];
      for (const draft of rows) {
        const reason = await syncOne(draft);
        if (reason) failed.push(m.syncFailed(draft.site || draft.id, reason));
      }
      setBusy(false);
      await reload();
      if (failed.length) setError(failed.join("\n"));
      else message.success(m.synced);
      router.refresh();
    },
    [message, reload, router, syncOne],
  );

  useEffect(() => {
    let alive = true;
    void listDrafts(projectId).then((rows) => {
      if (alive) setDrafts(rows);
    });
    const update = () => setOnline(navigator.onLine);
    queueMicrotask(update);
    // back online: send what waited on the device
    const back = () => {
      update();
      void listDrafts(projectId).then((rows) => syncAll(rows));
    };
    window.addEventListener("online", back);
    window.addEventListener("offline", update);
    return () => {
      alive = false;
      window.removeEventListener("online", back);
      window.removeEventListener("offline", update);
    };
  }, [projectId, syncAll]);

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, init);
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  function start() {
    setError(null);
    setEditing({
      id: crypto.randomUUID(),
      projectId,
      synced: false,
      site: "",
      surveyedOn: dayjs().format("YYYY-MM-DD"),
      latitude: null,
      longitude: null,
      summary: "",
      answers: {},
      photos: [],
      updatedAt: new Date().toISOString(),
    });
  }

  /** A synced draft taken back onto the device to go on with it. */
  function resume(survey: SiteSurveyView) {
    setError(null);
    const local = drafts.find((row) => row.id === survey.id);
    setEditing(
      local ?? {
        id: survey.id,
        projectId,
        synced: true,
        site: survey.site,
        surveyedOn: survey.surveyedOn,
        latitude: survey.latitude,
        longitude: survey.longitude,
        summary: survey.summary ?? "",
        answers: Object.fromEntries(
          survey.assumptions.map((row) => [
            row.index,
            { holds: row.holds, note: row.note ?? "" },
          ]),
        ),
        photos: [],
        updatedAt: new Date().toISOString(),
      },
    );
  }

  async function keep(andSync: boolean) {
    if (!editing) return;
    const kept = await putDraft(editing);
    setStored(kept);
    if (andSync || !kept) {
      setBusy(true);
      setError(null);
      const reason = await syncOne(editing);
      setBusy(false);
      if (reason) {
        setError(reason);
        await reload();
        return;
      }
      message.success(m.synced);
      router.refresh();
    } else {
      message.success(m.saved);
    }
    setEditing(null);
    await reload();
  }

  async function here() {
    if (!editing) return;
    setLocating(true);
    const where = await position();
    setLocating(false);
    if (!where) {
      message.warning(m.form.noGps);
      return;
    }
    setEditing({ ...editing, ...where });
  }

  async function addPhoto(file: File) {
    if (!editing) return;
    const where = await position();
    const photo: DraftPhoto = {
      id: crypto.randomUUID(),
      blob: file,
      name: file.name || "photo.jpg",
      caption: "",
      latitude: where?.latitude ?? null,
      longitude: where?.longitude ?? null,
      takenAt: new Date().toISOString(),
    };
    setEditing((current) =>
      current ? { ...current, photos: [...current.photos, photo] } : current,
    );
  }

  const answer = (index: number) =>
    editing?.answers[index] ?? { holds: null, note: "" };

  const synced = new Set(view.surveys.map((survey) => survey.id));
  const localOnly = drafts.filter((draft) => !synced.has(draft.id));

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        view.canWrite ? (
          <Space size={4}>
            {drafts.length > 0 && (
              <Button
                size="small"
                loading={busy}
                disabled={!online}
                onClick={() => void syncAll(drafts)}
              >
                {m.syncAll}
              </Button>
            )}
            <Button size="small" type="primary" onClick={start}>
              {m.start}
            </Button>
          </Space>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {!online && (
        <Alert className="mb-2" type="warning" showIcon title={m.offline} />
      )}
      {!stored && (
        <Alert className="mb-2" type="warning" showIcon title={m.noStorage} />
      )}
      {error && !editing && (
        <Alert
          className="mb-2 whitespace-pre-line"
          type="error"
          showIcon
          title={error}
        />
      )}

      {localOnly.map((draft) => (
        <div key={draft.id} className="mb-2 rounded border border-dashed p-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <span className="font-medium">{draft.site || m.local}</span>{" "}
              <Tag color="warning">{m.unsynced(draft.photos.length)}</Tag>
            </span>
            <Space size={0} wrap>
              <Button
                size="small"
                type="link"
                onClick={() => setEditing(draft)}
              >
                {m.edit}
              </Button>
              <Button
                size="small"
                type="link"
                disabled={!online || busy}
                onClick={() => void syncAll([draft])}
              >
                {m.sync}
              </Button>
              <Popconfirm
                title={m.discardConfirm}
                onConfirm={() => void dropDraft(draft.id).then(reload)}
              >
                <Button size="small" type="link" danger>
                  {m.discard}
                </Button>
              </Popconfirm>
            </Space>
          </div>
        </div>
      ))}

      {view.surveys.length ? (
        <div className="divide-y">
          {view.surveys.map((survey) => {
            const local = drafts.find((row) => row.id === survey.id);
            return (
              <div key={survey.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">
                      {survey.label} · {survey.site}
                    </span>{" "}
                    {survey.status === "completed" ? (
                      <Tag color="success">
                        {m.completed(
                          dayjs(survey.completedAt).format("D MMM YY"),
                          survey.completedByName ?? "",
                        )}
                      </Tag>
                    ) : (
                      <Tag>{m.draft}</Tag>
                    )}
                    {local && (
                      <Tag color="warning">
                        {m.unsynced(local.photos.length)}
                      </Tag>
                    )}
                  </div>
                  <Space size={0} wrap>
                    {survey.mayEdit && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => resume(survey)}
                      >
                        {m.edit}
                      </Button>
                    )}
                    {survey.mayComplete && (
                      <Popconfirm
                        title={m.completeConfirm}
                        disabled={survey.problems.length > 0}
                        onConfirm={() =>
                          void call(`${base}/${survey.id}/complete`, {
                            method: "POST",
                          })
                        }
                      >
                        <Button
                          size="small"
                          type="link"
                          disabled={survey.problems.length > 0 || busy}
                        >
                          {m.complete}
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </div>
                <Text type="secondary" className="block text-xs">
                  {dayjs(survey.surveyedOn).format("D MMM YY")}
                  {survey.createdByName && ` · ${m.by(survey.createdByName)}`}
                  {survey.latitude !== null && survey.longitude !== null && (
                    <>
                      {" · "}
                      <a
                        href={mapHref(survey.latitude, survey.longitude)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.map}
                      </a>
                    </>
                  )}
                </Text>
                {survey.summary && (
                  <div className="text-xs whitespace-pre-line">
                    {survey.summary}
                  </div>
                )}
                {survey.assumptions.map((row) => (
                  <div
                    key={row.index}
                    className="flex flex-wrap items-center gap-1 text-xs"
                  >
                    <span>
                      {row.index + 1}. {row.text}
                    </span>
                    {row.holds === null ? (
                      <Tag>{m.unchecked}</Tag>
                    ) : row.holds ? (
                      <Tag color="success">{m.holds}</Tag>
                    ) : (
                      <Tag color="error">{m.differs}</Tag>
                    )}
                    {row.note && (
                      <Text type="secondary" className="text-xs">
                        {row.note}
                      </Text>
                    )}
                    {row.changeRequestId ? (
                      <Tag color="processing">{m.changed}</Tag>
                    ) : (
                      row.holds === false &&
                      row.note &&
                      view.canEdit &&
                      survey.mayEdit && (
                        <Popconfirm
                          title={m.toChangeConfirm}
                          onConfirm={() =>
                            void call(
                              `${base}/${survey.id}/assumptions/${row.index}/change`,
                              { method: "POST" },
                            )
                          }
                        >
                          <Button size="small" type="link" disabled={busy}>
                            {m.toChange}
                          </Button>
                        </Popconfirm>
                      )
                    )}
                  </div>
                ))}
                {survey.problems.length > 0 && (
                  <Text type="warning" className="block text-xs">
                    {survey.problems.join(" · ")}
                  </Text>
                )}
                {survey.photos.length > 0 && (
                  <div className="text-xs">
                    {m.photos(survey.photos.length)}:{" "}
                    {survey.photos.map((photo) => (
                      <a
                        key={photo.id}
                        className="mr-2"
                        href={photoHref(survey.id, photo.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {photo.caption || photo.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !localOnly.length && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
        )
      )}

      <Modal
        open={editing !== null}
        title={m.form.title}
        onCancel={() => setEditing(null)}
        footer={[
          <Button key="close" onClick={() => setEditing(null)}>
            {m.form.close}
          </Button>,
          <Button key="keep" disabled={busy} onClick={() => void keep(false)}>
            {m.form.keep}
          </Button>,
          <Button
            key="sync"
            type="primary"
            loading={busy}
            disabled={!online}
            onClick={() => void keep(true)}
          >
            {m.form.keepAndSync}
          </Button>,
        ]}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && (
              <Alert
                className="whitespace-pre-line"
                type="error"
                showIcon
                title={error}
              />
            )}
            <label className="block text-xs">
              {m.form.site}
              <Input
                value={editing.site}
                maxLength={1000}
                onChange={(event) =>
                  setEditing({ ...editing, site: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.surveyedOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  allowClear={false}
                  value={dayjs(editing.surveyedOn)}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    value &&
                    setEditing({
                      ...editing,
                      surveyedOn: value.format("YYYY-MM-DD"),
                    })
                  }
                />
              </label>
              <div className="text-xs">
                {m.form.location}
                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    loading={locating}
                    onClick={() => void here()}
                  >
                    {m.form.here}
                  </Button>
                  {editing.latitude !== null && editing.longitude !== null && (
                    <a
                      href={mapHref(editing.latitude, editing.longitude)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {editing.latitude}, {editing.longitude}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <label className="block text-xs">
              {m.form.summary}
              <Input.TextArea
                rows={2}
                maxLength={4000}
                value={editing.summary}
                onChange={(event) =>
                  setEditing({ ...editing, summary: event.target.value })
                }
              />
            </label>
            <div className="text-xs">
              <Text strong className="text-xs">
                {m.form.assumptions}
              </Text>
              {view.assumptions.length === 0 && (
                <Text type="secondary" className="block text-xs">
                  {m.noAssumptions}
                </Text>
              )}
              {view.assumptions.map((text, index) => {
                const row = answer(index);
                const set = (next: Partial<typeof row>) =>
                  setEditing({
                    ...editing,
                    answers: {
                      ...editing.answers,
                      [index]: { ...row, ...next },
                    },
                  });
                return (
                  <div key={index} className="border-b py-1 last:border-b-0">
                    <div>
                      {index + 1}. {text}
                    </div>
                    <Radio.Group
                      size="small"
                      value={row.holds}
                      onChange={(event) =>
                        set({ holds: event.target.value as boolean })
                      }
                      options={[
                        { value: true, label: m.holds },
                        { value: false, label: m.differs },
                      ]}
                    />
                    {row.holds === false && (
                      <Input.TextArea
                        className="mt-1"
                        rows={2}
                        maxLength={4000}
                        placeholder={m.form.note}
                        value={row.note}
                        onChange={(event) => set({ note: event.target.value })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs">
              <Text strong className="text-xs">
                {m.form.photos}
              </Text>
              {editing.photos.map((photo) => (
                <div key={photo.id} className="flex items-center gap-2 py-1">
                  <Tag color="warning">{m.form.pending}</Tag>
                  <span className="truncate">{photo.name}</span>
                  <Input
                    size="small"
                    className="flex-1"
                    maxLength={500}
                    placeholder={m.form.caption}
                    value={photo.caption}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        photos: editing.photos.map((row) =>
                          row.id === photo.id
                            ? { ...row, caption: event.target.value }
                            : row,
                        ),
                      })
                    }
                  />
                  <Button
                    size="small"
                    type="link"
                    danger
                    onClick={() =>
                      setEditing({
                        ...editing,
                        photos: editing.photos.filter(
                          (row) => row.id !== photo.id,
                        ),
                      })
                    }
                  >
                    {m.form.removePhoto}
                  </Button>
                </div>
              ))}
              <label className="mt-1 block">
                {m.form.addPhoto}
                <input
                  type="file"
                  className="block text-sm"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void addPhoto(file);
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
