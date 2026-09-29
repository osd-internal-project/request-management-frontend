"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
} from "antd";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ContractDetail, ContractKind } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts;
const f = m.form;

interface Draft {
  kind: ContractKind;
  contractNo: string;
  title: string;
  party: "customer" | "other";
  customerId?: string;
  counterpartyName: string;
  counterpartyTaxId: string;
  startOn: string | null;
  endOn: string | null;
  value: number | null;
  note: string;
  status: "active" | "cancelled";
  ndaScope: string;
  ndaDirection?: string;
  masterId?: string;
}

function draftOf(contract?: ContractDetail): Draft {
  return {
    kind: contract?.kind ?? "standard",
    contractNo: contract?.contractNo ?? "",
    title: contract?.title ?? "",
    party: contract && !contract.customer ? "other" : "customer",
    customerId: contract?.customer?.id,
    counterpartyName: contract?.counterpartyName ?? "",
    counterpartyTaxId: contract?.counterpartyTaxId ?? "",
    startOn: contract?.startOn?.slice(0, 10) ?? null,
    endOn: contract?.endOn?.slice(0, 10) ?? null,
    value:
      contract?.value === null || contract?.value === undefined
        ? null
        : Number(contract.value),
    note: contract?.note ?? "",
    status: contract?.status === "cancelled" ? "cancelled" : "active",
    ndaScope: contract?.ndaScope ?? "",
    ndaDirection: contract?.ndaDirection ?? undefined,
    masterId: contract?.masterContractId ?? undefined,
  };
}

/**
 * CD-161 — record a contract in the repository, or edit one. The party is a
 * customer from the register or anyone else by name (an NDA with a partner).
 */
export function ContractForm({
  open,
  contract,
  onClose,
}: {
  readonly open: boolean;
  /** Absent = a new contract. */
  readonly contract?: ContractDetail;
  readonly onClose: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft>(() => draftOf(contract));
  const [customers, setCustomers] = useState<
    { value: string; label: string }[]
  >(
    contract?.customer
      ? [
          {
            value: contract.customer.id,
            label: `${contract.customer.customerCode} · ${contract.customer.nameTh}`,
          },
        ]
      : [],
  );
  const [busy, setBusy] = useState(false);
  // CD-149 — the MSAs a contract may be made under (the server checks the party)
  const [masters, setMasters] = useState<{ value: string; label: string }[]>(
    contract?.master
      ? [
          {
            value: contract.master.id,
            label: `${contract.master.contractNo} · ${contract.master.title}`,
          },
        ]
      : [],
  );
  useEffect(() => {
    if (!open) return;
    let live = true;
    void appApi<{
      data: {
        id: string;
        contractNo: string;
        title: string;
        customer: { nameTh: string } | null;
        counterpartyName: string | null;
      }[];
    }>("contracts?kind=msa&page_size=100").then((result) => {
      if (!live || !result.ok) return;
      setMasters(
        result.data.data
          .filter((row) => row.id !== contract?.id)
          .map((row) => ({
            value: row.id,
            label: `${row.contractNo} · ${row.title} — ${
              row.customer?.nameTh ?? row.counterpartyName ?? ""
            }`,
          })),
      );
    });
    return () => {
      live = false;
    };
  }, [open, contract?.id]);
  const [error, setError] = useState<string | null>(null);
  const set = (next: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...next }));

  async function searchCustomers(text: string) {
    if (text.trim().length < 2) return;
    const result = await appApi<{
      data: { id: string; customerCode: string; nameTh: string }[];
    }>(`customers?search=${encodeURIComponent(text.trim())}&page_size=20`);
    if (result.ok) {
      setCustomers(
        result.data.data.map((row) => ({
          value: row.id,
          label: `${row.customerCode} · ${row.nameTh}`,
        })),
      );
    }
  }

  async function save() {
    if (
      !draft.contractNo.trim() ||
      !draft.title.trim() ||
      !draft.endOn ||
      (draft.party === "customer"
        ? !draft.customerId
        : !draft.counterpartyName.trim())
    ) {
      setError(f.required);
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      kind: draft.kind,
      contract_no: draft.contractNo.trim(),
      title: draft.title.trim(),
      ...(draft.party === "customer"
        ? { customer_id: draft.customerId }
        : {
            customer_id: null,
            counterparty_name: draft.counterpartyName.trim(),
            counterparty_tax_id: draft.counterpartyTaxId.trim() || undefined,
          }),
      start_on: draft.startOn,
      end_on: draft.endOn,
      value: draft.value,
      note: draft.note,
      nda_scope: draft.kind === "nda" ? draft.ndaScope : null,
      nda_direction: draft.kind === "nda" ? (draft.ndaDirection ?? null) : null,
      master_contract_id: draft.kind === "msa" ? "" : (draft.masterId ?? ""),
      ...(contract ? { status: draft.status } : {}),
    };
    const result = await appApi<{ id: string }>(
      contract ? `contracts/${contract.id}` : "contracts",
      {
        method: contract ? "PATCH" : "POST",
        body: JSON.stringify(body),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(f.saved);
    onClose();
    if (contract) router.refresh();
    else router.push(ROUTES.contractDetail(result.data.id));
  }

  const label = (text: string, required = false) => (
    <span className="mb-1 block text-sm">
      {text}
      {required && <span className="text-red-500"> *</span>}
    </span>
  );

  return (
    <Modal
      open={open}
      width={640}
      title={contract ? f.editTitle(contract.contractNo) : f.createTitle}
      onCancel={onClose}
      okText={f.save}
      okButtonProps={{ loading: busy }}
      onOk={() => void save()}
      destroyOnHidden
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          {label(f.kind, true)}
          <Select
            className="w-full"
            value={draft.kind}
            onChange={(kind: ContractKind) => set({ kind })}
            options={Object.entries(m.kind).map(([value, text]) => ({
              value,
              label: text,
            }))}
          />
        </div>
        <div>
          {label(f.contractNo, true)}
          <Input
            value={draft.contractNo}
            maxLength={60}
            onChange={(event) => set({ contractNo: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          {label(f.title, true)}
          <Input
            value={draft.title}
            maxLength={255}
            onChange={(event) => set({ title: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          {label(f.partyType, true)}
          <Segmented<"customer" | "other">
            value={draft.party}
            onChange={(party) => set({ party })}
            options={[
              { value: "customer", label: f.partyCustomer },
              { value: "other", label: f.partyOther },
            ]}
          />
        </div>
        {draft.party === "customer" ? (
          <div className="sm:col-span-2">
            {label(f.customer, true)}
            <Select
              className="w-full"
              showSearch
              filterOption={false}
              placeholder={f.customerPlaceholder}
              value={draft.customerId}
              options={customers}
              onSearch={(text) => void searchCustomers(text)}
              onChange={(customerId: string) => set({ customerId })}
            />
          </div>
        ) : (
          <>
            <div>
              {label(f.counterpartyName, true)}
              <Input
                value={draft.counterpartyName}
                maxLength={255}
                onChange={(event) =>
                  set({ counterpartyName: event.target.value })
                }
              />
            </div>
            <div>
              {label(f.counterpartyTaxId)}
              <Input
                value={draft.counterpartyTaxId}
                maxLength={13}
                inputMode="numeric"
                onChange={(event) =>
                  set({
                    counterpartyTaxId: event.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </div>
          </>
        )}
        <div>
          {label(f.startOn)}
          <DatePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={draft.startOn ? dayjs(draft.startOn) : null}
            onChange={(next) =>
              set({ startOn: next ? next.format("YYYY-MM-DD") : null })
            }
          />
        </div>
        <div>
          {label(f.endOn, true)}
          <DatePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={draft.endOn ? dayjs(draft.endOn) : null}
            onChange={(next) =>
              set({ endOn: next ? next.format("YYYY-MM-DD") : null })
            }
          />
        </div>
        <div>
          {label(f.value)}
          <InputNumber
            className="w-full!"
            min={0}
            value={draft.value}
            onChange={(value) => set({ value: value ?? null })}
          />
        </div>
        {draft.kind === "nda" && (
          <>
            <div className="sm:col-span-2">
              {label(f.ndaScope)}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                placeholder={f.ndaScopePlaceholder}
                value={draft.ndaScope}
                onChange={(event) => set({ ndaScope: event.target.value })}
              />
            </div>
            <div>
              {label(f.ndaDirection)}
              <Select
                className="w-full"
                allowClear
                value={draft.ndaDirection}
                onChange={(ndaDirection?: string) => set({ ndaDirection })}
                options={Object.entries(m.ndaDirection).map(
                  ([value, text]) => ({ value, label: text }),
                )}
              />
            </div>
          </>
        )}
        {draft.kind !== "msa" && (
          <div className="sm:col-span-2">
            {label(f.master)}
            <Select
              className="w-full"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={f.masterPlaceholder}
              value={draft.masterId}
              onChange={(masterId?: string) => set({ masterId })}
              options={masters}
            />
            <span className="mt-1 block text-xs text-gray-500">
              {f.masterHint}
            </span>
          </div>
        )}
        {contract && (
          <div>
            {label(f.status)}
            <Select
              className="w-full"
              value={draft.status}
              onChange={(status: "active" | "cancelled") => set({ status })}
              options={[
                { value: "active", label: m.status.active },
                { value: "cancelled", label: m.status.cancelled },
              ]}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          {label(f.note)}
          <Input.TextArea
            rows={2}
            maxLength={2000}
            value={draft.note}
            onChange={(event) => set({ note: event.target.value })}
          />
        </div>
      </div>
      {error && <Alert className="mt-3!" type="error" showIcon title={error} />}
    </Modal>
  );
}
