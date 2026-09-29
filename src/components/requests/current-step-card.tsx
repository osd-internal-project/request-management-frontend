"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, ConfigProvider, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  attachmentFileUrl,
  removeAttachment,
  saveStepForm,
  uploadAttachment,
} from "@/lib/api/client-requests";
import { FilePickButton, SchemaField } from "@/components/requests/request-form";
import { SubRequestChecklist } from "@/components/requests/sub-request-checklist";
import {
  fieldOrder,
  isRequiredDoc,
  type FormSchema,
  type RequestAttachment,
  type RequiredDoc,
  type NamedSubRequestType,
  type RequestTreeNode,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

const t = messages.requestDetail.flow;

/** The work of the current flow step: its form (saved as a draft) and its sub-request checklist. */
export function CurrentStepCard({
  requestId,
  stepName,
  formSchema,
  initial,
  checklist,
  childRequests,
  requiresApproval,
  isLast,
  canEdit,
  requiredDocs = [],
  attachments = [],
}: {
  readonly requestId: string;
  readonly stepName: string;
  readonly formSchema: FormSchema | null;
  readonly initial: Record<string, unknown>;
  readonly checklist: readonly NamedSubRequestType[];
  /** Children raised in this step only. */
  readonly childRequests: readonly RequestTreeNode[];
  readonly requiresApproval: boolean;
  readonly isLast: boolean;
  /** Only whoever holds the step. */
  readonly canEdit: boolean;
  /** v2 requester steps: documents to attach before leaving the step. */
  readonly requiredDocs?: readonly RequiredDoc[];
  readonly attachments?: readonly RequestAttachment[];
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = new Set(formSchema?.required ?? []);
  const fields = Object.entries(formSchema?.properties ?? {}).sort(
    ([, a], [, b]) => fieldOrder(a) - fieldOrder(b),
  );

  async function attach(file: File, docCode: string) {
    setBusy(true);
    setError(null);
    const added = await uploadAttachment(requestId, file, docCode);
    setBusy(false);
    if (!added.ok) setError(added.message);
    else router.refresh();
  }

  async function detach(attachmentId: string) {
    const removed = await removeAttachment(requestId, attachmentId);
    if (!removed.ok) setError(removed.message);
    else router.refresh();
  }

  async function save() {
    setBusy(true);
    setError(null);
    const result = await saveStepForm(requestId, values);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    void message.success(t.draftSaved);
    router.refresh();
  }

  return (
    <Card title={t.currentStep(stepName)} size="small">
      <div className="space-y-4">
        {requiresApproval && <Alert type="info" showIcon title={t.needsApproval} />}
        {isLast && <Alert type="info" showIcon title={t.lastStep} />}
        {error && <Alert type="error" showIcon title={error} />}

        {checklist.length > 0 && (
          <SubRequestChecklist
            requestId={requestId}
            items={checklist}
            childRequests={childRequests}
            canCreate={canEdit}
          />
        )}

        {requiredDocs.length > 0 && (
          <ul className="m-0 list-none space-y-2 p-0">
            {requiredDocs.map((doc) => {
              const attached = attachments.find((entry) => entry.docCode === doc.code);
              return (
                <li
                  key={doc.code}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-black/8 px-3 py-2 text-sm"
                >
                  <Text strong>{doc.name}</Text>
                  {isRequiredDoc(doc) && !attached && <Tag color="orange">{t.docMissing}</Tag>}
                  {attached ? (
                    <>
                      <a href={attachmentFileUrl(attached.requestId, attached.id)} className="text-xs">
                        {attached.fileName}
                      </a>
                      {canEdit && (
                        <Button
                          size="small"
                          type="link"
                          danger
                          className="ms-auto px-0!"
                          onClick={() => void detach(attached.id)}
                        >
                          {messages.requestForm.remove}
                        </Button>
                      )}
                    </>
                  ) : (
                    canEdit && (
                      <FilePickButton
                        className="ms-auto"
                        busy={busy}
                        disabled={busy}
                        onPick={(file) => void attach(file, doc.code)}
                      />
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {fields.length > 0 ? (
          <>
            <Text strong className="block">
              {t.stepForm}
            </Text>
            <ConfigProvider componentDisabled={!canEdit}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                {fields.map(([name, property]) => (
                  <SchemaField
                    key={name}
                    name={name}
                    property={property}
                    required={required.has(name)}
                    value={values[name]}
                    onChange={(next) =>
                      setValues((current) => ({ ...current, [name]: next }))
                    }
                  />
                ))}
              </div>
            </ConfigProvider>
            {canEdit && (
              <Button loading={busy} onClick={() => void save()}>
                {t.saveDraft}
              </Button>
            )}
          </>
        ) : (
          <Text type="secondary">{t.noForm}</Text>
        )}
      </div>
    </Card>
  );
}
