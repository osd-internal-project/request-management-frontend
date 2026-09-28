"use client";

import { useMemo, type ReactNode } from "react";
import { Alert, Checkbox, Input, InputNumber, Tabs } from "antd";
import Link from "next/link";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import Paragraph from "antd/es/typography/Paragraph";
import {
  SLA_COVERAGES,
  type DirectoryUser,
  type OrgUnitNode,
  type RequestType,
} from "@/lib/api/types";
import { buildUnitTree } from "@/lib/org/org-tree";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { SearchSelect, SearchTreeSelect } from "@/components/ui/search-select";
import { RequiredDocs, ReturnReasons } from "./coded-label-editors";
import { FormSchemaEditor } from "./form-schema-editor";
import { SeverityTargetsEditor } from "./severity-targets-editor";
import { SubRequestEditor } from "./sub-request-editor";
import type { TypeDraft } from "./type-draft";

/**
 * The รายละเอียด tab, grouped the way an admin sets a type up: what it is, who
 * receives it, who may raise it, what it asks for — with the long forms last.
 */
export function TypeDetailForm({
  code,
  draft,
  error,
  orgUnits,
  people,
  types,
  onChange,
}: {
  readonly code: string | null;
  readonly draft: TypeDraft;
  readonly error: string | null;
  readonly orgUnits: OrgUnitNode[];
  readonly people: readonly DirectoryUser[];
  /** The company's catalog, for picking sub-request types. */
  readonly types: readonly RequestType[];
  readonly onChange: (patch: Partial<TypeDraft>) => void;
}) {
  const unitTree = useMemo(() => buildUnitTree(orgUnits), [orgUnits]);
  const unitOptions = useMemo(
    () => orgUnits.map((unit) => ({ value: unit.id, label: unit.name })),
    [orgUnits],
  );
  const peopleOptions = useMemo(
    () =>
      people.map((person) => ({
        value: person.id,
        label: person.orgUnitName
          ? `${person.displayName} · ${person.orgUnitName}`
          : person.displayName,
      })),
    [people],
  );

  return (
    <div className="space-y-6">
      <Alert type="info" showIcon title={messages.requestTypes.effectNote} />
      {error && <Alert type="error" showIcon title={error} />}

      <Section title={messages.requestTypes.sectionGeneral}>
        <label className="block max-w-md">
          <Text strong>{messages.requestTypes.name}</Text>
          <Input
            className="mt-1"
            value={draft.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
      </Section>

      <Section title={messages.requestTypes.sectionReceiving}>
        <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
          <label className="block">
            <Text strong>{messages.requestTypes.receiver}</Text>
            <SearchSelect
              className="mt-1 w-full"
              allowClear
              value={draft.receiver ?? undefined}
              placeholder={messages.requestTypes.noReceiver}
              onChange={(next?: string) => onChange({ receiver: next ?? null })}
              options={unitOptions}
            />
          </label>

          <label className="block">
            <Text strong>{messages.requestTypes.fixedReceiver}</Text>
            <SearchSelect
              className="mt-1 w-full"
              allowClear
              value={draft.fixedReceiver ?? undefined}
              placeholder={messages.requestTypes.fixedReceiverPlaceholder}
              onChange={(next?: string) =>
                onChange({ fixedReceiver: next ?? null })
              }
              options={peopleOptions}
            />
            <Text type="secondary" className="mt-1 block text-xs">
              {messages.requestTypes.fixedReceiverHint}
            </Text>
          </label>
        </div>

        <label className="block">
          <Text strong>{messages.requestTypes.sla}</Text>
          <div className="mt-1 flex max-w-xl items-center gap-2">
            <InputNumber
              className="w-24 shrink-0"
              min={1}
              value={draft.slaHours ?? undefined}
              onChange={(next) => onChange({ slaHours: next ?? null })}
            />
            <SearchSelect
              className="min-w-0 flex-1"
              value={draft.coverage}
              onChange={(coverage) => onChange({ coverage })}
              options={SLA_COVERAGES.map((value) => ({
                value,
                label: messages.requestTypes.coverage[value],
              }))}
            />
          </div>
          <Link href={ROUTES.adminSla}>
            <Text type="secondary" className="text-xs underline">
              {messages.requestTypes.workingHoursLink}
            </Text>
          </Link>
        </label>

        <SeverityTargetsEditor
          value={draft.severityTargets}
          onChange={(severityTargets) => onChange({ severityTargets })}
        />
      </Section>

      <Section title={messages.requestTypes.sectionEligibility}>
        <label className="block">
          <Text strong>{messages.requestTypes.eligibleUnits}</Text>
          <SearchTreeSelect
            className="mt-1 w-full"
            multiple
            allowClear
            treeDefaultExpandAll
            value={draft.eligibleUnits}
            onChange={(eligibleUnits: string[]) => onChange({ eligibleUnits })}
            placeholder={messages.requestTypes.eligibleUnitsAll}
            treeData={unitTree}
          />
          <Text type="secondary" className="mt-1 block text-xs">
            {messages.requestTypes.eligibleUnitsHint}
          </Text>
        </label>

        {/*
          §16 draws `อ้างอิงโอกาสการขาย *` on the DSC mockup, and the submit screen
          demanded it for every type as a result — including the ones with
          no opportunity to point at. It is the type's rule, so it is set here.
        */}
        <label className="block">
          <Checkbox
            checked={draft.refRequired}
            onChange={(event) => onChange({ refRequired: event.target.checked })}
          >
            {messages.requestTypes.refRequired}
          </Checkbox>
          <Text type="secondary" className="block text-xs">
            {messages.requestTypes.refRequiredHint}
          </Text>
        </label>
      </Section>

      <Section title={messages.requestTypes.sectionDocs}>
        <div className="grid gap-6 lg:grid-cols-2">
          <RequiredDocs
            entries={draft.docs}
            onChange={(docs) => onChange({ docs })}
          />
          <ReturnReasons
            entries={draft.reasons}
            onChange={(reasons) => onChange({ reasons })}
          />
        </div>
      </Section>

      <Section title={messages.requestTypes.sectionSubRequests}>
        <SubRequestEditor
          ownCode={code}
          entries={draft.subRequests}
          types={types}
          onChange={(subRequests) => onChange({ subRequests })}
        />
      </Section>

      <Section title={messages.requestTypes.sectionForms}>
        {/*
          Two forms, two tabs. Side by side they read as one long form and
          an admin loses track of which half the requester will see.
        */}
        <Tabs
          items={[
            {
              key: "requester",
              label: messages.requestTypes.requesterForm,
              children: (
                <FormSchemaEditor
                  rows={draft.rows}
                  onChange={(rows) => onChange({ rows })}
                />
              ),
            },
            {
              key: "receiver",
              label: messages.requestTypes.receiverForm,
              children: (
                <>
                  <Paragraph type="secondary" className="text-xs">
                    {messages.requestTypes.receiverFormHint}
                  </Paragraph>
                  <FormSchemaEditor
                    rows={draft.receiverRows}
                    onChange={(receiverRows) => onChange({ receiverRows })}
                  />
                </>
              ),
            },
          ]}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-black/5 pt-5">
      <Title level={5} className="mb-0!">
        {title}
      </Title>
      {children}
    </section>
  );
}
