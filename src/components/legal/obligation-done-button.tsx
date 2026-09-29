"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input, Modal } from "antd";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.contracts.obligations;

/** CD-163 — "ทำแล้ว", with an optional note; the owner's or Legal's. */
export function ObligationDoneButton({
  obligation,
}: {
  readonly obligation: { id: string; title: string };
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function done() {
    setBusy(true);
    const result = await appApi(`contract-obligations/${obligation.id}/done`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.marked);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="small" type="primary" onClick={() => setOpen(true)}>
        {m.done}
      </Button>
      <Modal
        open={open}
        title={m.doneTitle(obligation.title)}
        onCancel={() => setOpen(false)}
        okText={m.done}
        okButtonProps={{ loading: busy }}
        onOk={() => void done()}
      >
        <Input.TextArea
          rows={2}
          maxLength={1000}
          placeholder={m.doneNote}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>
    </>
  );
}
