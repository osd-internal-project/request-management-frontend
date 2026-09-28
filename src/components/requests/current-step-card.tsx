"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, ConfigProvider } from "antd";
import Text from "antd/es/typography/Text";
import { saveStepForm } from "@/lib/api/client-requests";
import { SchemaField } from "@/components/requests/request-form";
import { SubRequestChecklist } from "@/components/requests/sub-request-checklist";
import {
  fieldOrder,
  type FormSchema,
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
  /** Only whoever carries the work, while it is in progress. */
  readonly canEdit: boolean;
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
