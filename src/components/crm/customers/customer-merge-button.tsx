"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Descriptions, Input, Modal, Select } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.customers.merge;

interface Preview {
  source: { id: string; customerCode: string; nameTh: string };
  target: { id: string; customerCode: string; nameTh: string };
  counts: Record<string, number>;
  kept: { externalCodes: string[]; accountPlan: boolean };
  warnings: string[];
}

/**
 * CD-122 — รวมลูกค้าซ้ำ from the duplicate's page (admins only): pick the
 * customer that stays, read what will move and the warnings, give a reason,
 * confirm. Afterwards the page is the survivor's.
 */
export function CustomerMergeButton({
  customer,
}: {
  readonly customer: { id: string; customerCode: string; nameTh: string };
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [into, setInto] = useState<string | undefined>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setInto(undefined);
    setPreview(null);
    setReason("");
    setError(null);
  }

  async function search(text: string) {
    if (text.trim().length < 2) return;
    const result = await appApi<{
      data: {
        id: string;
        customerCode: string;
        nameTh: string;
        mergedIntoCustomerId?: string | null;
      }[];
    }>(`customers?search=${encodeURIComponent(text.trim())}&page_size=20`);
    if (!result.ok) return;
    setOptions(
      result.data.data
        .filter((row) => row.id !== customer.id && !row.mergedIntoCustomerId)
        .map((row) => ({
          value: row.id,
          label: `${row.customerCode} · ${row.nameTh}`,
        })),
    );
  }

  async function pick(target: string) {
    setInto(target);
    setPreview(null);
    setError(null);
    setBusy(true);
    const result = await appApi<Preview>(
      `customers/${customer.id}/merge-preview?into=${encodeURIComponent(target)}`,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPreview(result.data);
  }

  async function merge() {
    if (!into) return;
    setBusy(true);
    setError(null);
    const result = await appApi<{ target: { id: string } }>(
      `customers/${customer.id}/merge`,
      { method: "POST", body: JSON.stringify({ into, reason }) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.done);
    setOpen(false);
    router.push(ROUTES.customerDetail(result.data.target.id));
  }

  const moved = preview
    ? Object.entries(preview.counts).filter(([, count]) => count > 0)
    : [];

  return (
    <>
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {m.button}
      </Button>
      <Modal
        open={open}
        width={640}
        title={m.title(customer.customerCode)}
        onCancel={() => setOpen(false)}
        okText={m.confirm}
        okButtonProps={{
          danger: true,
          loading: busy,
          disabled: !preview || !reason.trim(),
        }}
        onOk={() => void merge()}
      >
        <div className="space-y-3">
          <Text type="secondary" className="block text-sm">
            {m.intro}
          </Text>
          <div>
            <span className="mb-1 block text-sm">{m.into}</span>
            <Select
              className="w-full"
              showSearch
              filterOption={false}
              placeholder={m.searchPlaceholder}
              value={into}
              options={options}
              onSearch={(text) => void search(text)}
              onChange={(value: string) => void pick(value)}
              notFoundContent={m.searchHint}
            />
          </div>

          {error && <Alert type="error" showIcon title={error} />}

          {preview && (
            <>
              <Descriptions
                size="small"
                column={1}
                bordered
                items={[
                  {
                    key: "source",
                    label: m.becomesAlias,
                    children: `${preview.source.customerCode} · ${preview.source.nameTh}`,
                  },
                  {
                    key: "target",
                    label: m.stays,
                    children: `${preview.target.customerCode} · ${preview.target.nameTh}`,
                  },
                  {
                    key: "moved",
                    label: m.moved,
                    children: moved.length
                      ? moved
                          .map(
                            ([key, count]) => `${m.kinds[key] ?? key} ${count}`,
                          )
                          .join(" · ")
                      : m.nothingMoved,
                  },
                ]}
              />
              {preview.warnings.map((warning) => (
                <Alert key={warning} type="warning" showIcon title={warning} />
              ))}
              <div>
                <span className="mb-1 block text-sm">
                  {m.reason}
                  <span className="text-red-500"> *</span>
                </span>
                <Input.TextArea
                  rows={2}
                  maxLength={500}
                  value={reason}
                  placeholder={m.reasonPlaceholder}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <Text type="secondary" className="block text-xs">
                {m.irreversible}
              </Text>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
