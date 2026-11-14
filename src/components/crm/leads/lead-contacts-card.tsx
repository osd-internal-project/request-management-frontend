"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Input,
  Modal,
  Tooltip,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type { LeadContact } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const mc = messages.sales.leads.detail.contactCard;

interface ContactValues {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}

/** `"new"` = the add form; a contact = editing that one. */
type Editing = "new" | LeadContact | null;

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

/** Blank inputs are left out: the backend writes the whole contact, absent = empty. */
function body(values: ContactValues, isPrimary: boolean) {
  return JSON.stringify({
    name: values.name.trim(),
    position: values.position?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    email: values.email?.trim() || undefined,
    ...(isPrimary ? { is_primary: true } : {}),
  });
}

/**
 * ผู้ติดต่อทั้งหมดของ Lead (12 พ.ย. 2569) — the "+" adds one person through
 * its own small form instead of opening the whole Lead for editing. The
 * primary contact (★) is who sales emails and quotations go to; any other
 * contact can be made primary, which swaps the two.
 */
export function LeadContactsCard({
  leadId,
  leadName,
  contacts,
  editable,
}: {
  readonly leadId: string;
  /** shown for a primary contact that has only a phone or an email */
  readonly leadName: string;
  readonly contacts: LeadContact[];
  readonly editable: boolean;
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState<Editing>(null);

  const nameOf = (contact: LeadContact) => contact.name ?? leadName;

  async function makePrimary(contact: LeadContact) {
    const result = await appApi(`leads/${leadId}/contacts/${contact.id}`, {
      method: "PATCH",
      body: body(
        {
          name: nameOf(contact),
          position: contact.position ?? undefined,
          phone: contact.phone ?? undefined,
          email: contact.email ?? undefined,
        },
        true,
      ),
    });
    if (!result.ok) return void message.error(result.message);
    void message.success(mc.primaryChanged);
    router.refresh();
  }

  function confirmRemove(contact: LeadContact) {
    const hint = contact.isPrimary
      ? contacts.length > 1
        ? mc.removePrimaryHint
        : mc.removeOnlyHint
      : undefined;

    modal.confirm({
      title: mc.removeConfirm(nameOf(contact)),
      content: hint,
      okText: mc.remove,
      okButtonProps: { danger: true },
      cancelText: mc.cancel,
      onOk: async () => {
        const result = await appApi(`leads/${leadId}/contacts/${contact.id}`, {
          method: "DELETE",
        });
        if (!result.ok) return void message.error(result.message);
        void message.success(mc.removed);
        router.refresh();
      },
    });
  }

  return (
    <Card
      size="small"
      title={mc.all(String(contacts.length))}
      extra={
        editable ? (
          <Tooltip title={mc.add}>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              aria-label={mc.add}
              onClick={() => setEditing("new")}
            />
          </Tooltip>
        ) : null
      }
    >
      {contacts.length === 0 ? (
        <Text type="secondary" className="text-xs">
          {mc.noContact}
        </Text>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-start gap-2">
              <Avatar size="small" className="shrink-0">
                {initials(nameOf(contact))}
              </Avatar>
              <div className="min-w-0 flex-1 text-xs">
                <div className="font-medium">
                  {nameOf(contact)}{" "}
                  {contact.isPrimary && (
                    <Tooltip title={mc.primary}>
                      <span className="text-amber-500">★</span>
                    </Tooltip>
                  )}
                </div>
                {contact.position && (
                  <Text type="secondary" className="block">
                    {contact.position}
                  </Text>
                )}
                {contact.email && (
                  <div className="truncate" title={contact.email}>
                    {contact.email}
                  </div>
                )}
                {contact.phone && <div>{contact.phone}</div>}
              </div>
              {editable && (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "edit",
                        icon: <EditOutlined />,
                        label: mc.edit,
                        onClick: () => setEditing(contact),
                      },
                      ...(contact.isPrimary
                        ? []
                        : [
                            {
                              key: "primary",
                              icon: <StarOutlined />,
                              label: mc.makePrimary,
                              onClick: () => void makePrimary(contact),
                            },
                          ]),
                      {
                        key: "remove",
                        icon: <DeleteOutlined />,
                        label: mc.remove,
                        danger: true,
                        onClick: () => confirmRemove(contact),
                      },
                    ],
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    aria-label={`${mc.actions} ${nameOf(contact)}`}
                  />
                </Dropdown>
              )}
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <ContactModal
          leadId={leadId}
          leadName={leadName}
          contact={editing === "new" ? null : editing}
          first={contacts.length === 0}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}

function ContactModal({
  leadId,
  leadName,
  contact,
  first,
  onClose,
  onSaved,
}: {
  leadId: string;
  leadName: string;
  /** `null` = adding */
  contact: LeadContact | null;
  /** the lead has no contact yet, so this one becomes the primary */
  first: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ContactValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let values: ContactValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi(
      contact
        ? `leads/${leadId}/contacts/${contact.id}`
        : `leads/${leadId}/contacts`,
      {
        method: contact ? "PATCH" : "POST",
        body: body(values, values.is_primary === true),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    void message.success(contact ? mc.saved : mc.added);
    onSaved();
  }

  return (
    <Modal
      open
      title={contact ? mc.editTitle : mc.addTitle}
      okText={mc.save}
      cancelText={mc.cancel}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      mask={{ closable: false }}
      destroyOnHidden
      width={440}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form<ContactValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: contact ? (contact.name ?? leadName) : "",
          position: contact?.position ?? "",
          phone: contact?.phone ?? "",
          email: contact?.email ?? "",
          is_primary: false,
        }}
      >
        <Form.Item
          name="name"
          label={mc.fields.name}
          rules={[
            { required: true, whitespace: true, message: mc.nameRequired },
          ]}
        >
          <Input maxLength={255} autoFocus />
        </Form.Item>
        <Form.Item name="position" label={mc.fields.position}>
          <Input maxLength={120} />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
          <Form.Item name="phone" label={mc.fields.phone}>
            <Input maxLength={50} inputMode="tel" />
          </Form.Item>
          <Form.Item
            name="email"
            label={mc.fields.email}
            rules={[{ type: "email", message: mc.emailInvalid }]}
          >
            <Input maxLength={255} inputMode="email" />
          </Form.Item>
        </div>
        {first ? (
          <Text type="secondary" className="text-xs">
            {mc.firstIsPrimary}
          </Text>
        ) : contact?.isPrimary ? (
          <Text type="secondary" className="text-xs">
            {mc.primaryHint}
          </Text>
        ) : (
          <Form.Item
            name="is_primary"
            valuePropName="checked"
            className="mb-0!"
            extra={mc.primaryHint}
          >
            <Checkbox>{mc.fields.isPrimary}</Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
