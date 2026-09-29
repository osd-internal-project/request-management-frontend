"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Image, Popconfirm } from "antd";
import { CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type { ActivityPhoto } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const mp = messages.sales.opportunities.detail.photos;

/** Where the browser reads a photo — through the BFF, with the viewer's session. */
export function activityPhotoUrl(
  opportunityId: string,
  activityId: string,
  photoId: string,
): string {
  return `/api/app/opportunities/${opportunityId}/activities/${activityId}/photos/${photoId}`;
}

/**
 * Uploads each file in turn; returns how many failed and the first reason.
 * Shared by the deal card and the phone "log a visit" page.
 */
export async function uploadActivityPhotos(
  opportunityId: string,
  activityId: string,
  files: File[],
): Promise<{ failed: number; reason: string | null }> {
  let failed = 0;
  let reason: string | null = null;
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    const result = await appApi(
      `opportunities/${opportunityId}/activities/${activityId}/photos`,
      { method: "POST", body: form },
    );
    if (!result.ok) {
      failed += 1;
      reason ??= result.message;
    }
  }
  return { failed, reason };
}

/**
 * CD-75 — the photos on one activity: thumbnails that open full size, a
 * camera button (the phone opens its camera; a desktop opens files), and a
 * remove control on the viewer's own photos.
 */
export function ActivityPhotos({
  opportunityId,
  activityId,
  photos,
  editable,
  currentUserId,
}: {
  readonly opportunityId: string;
  readonly activityId: string;
  readonly photos: ActivityPhoto[];
  readonly editable: boolean;
  readonly currentUserId: string | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const { failed, reason } = await uploadActivityPhotos(
      opportunityId,
      activityId,
      [...files],
    );
    setBusy(false);
    if (input.current) input.current.value = "";
    if (failed) void message.error(mp.uploadFailed(failed, reason ?? ""));
    else void message.success(mp.uploaded);
    router.refresh();
  }

  async function remove(photoId: string) {
    const result = await appApi(
      `opportunities/${opportunityId}/activities/${activityId}/photos/${photoId}`,
      { method: "DELETE" },
    );
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    router.refresh();
  }

  if (!photos.length && !editable) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <Image.PreviewGroup>
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <Image
              width={64}
              height={64}
              className="rounded object-cover"
              src={activityPhotoUrl(opportunityId, activityId, photo.id)}
              alt={photo.fileName}
            />
            {editable && photo.uploadedBy === currentUserId && (
              <Popconfirm
                title={mp.removeConfirm}
                onConfirm={() => void remove(photo.id)}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  className="absolute! -top-2 -right-2 bg-white!"
                  aria-label={mp.remove}
                />
              </Popconfirm>
            )}
          </div>
        ))}
      </Image.PreviewGroup>
      {editable && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(event) => void add(event.target.files)}
          />
          <Button
            size="small"
            icon={<CameraOutlined />}
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {mp.add}
          </Button>
        </>
      )}
    </div>
  );
}
