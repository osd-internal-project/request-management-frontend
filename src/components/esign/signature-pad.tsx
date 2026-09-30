"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Segmented } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";

const m = messages.esign.sign;

export interface SignatureValue {
  kind: "draw" | "type" | "upload";
  image?: string;
  text?: string;
}

const MAX_BYTES = 500_000;

/**
 * CD-168 รับลายมือชื่อ — draw with a finger or mouse, type a name, or
 * upload a picture. Hands back what the API takes: a PNG/JPEG data URL, or
 * the typed text; `null` while nothing usable is there.
 */
export function SignaturePad({
  onChange,
  defaultName,
}: {
  readonly onChange: (value: SignatureValue | null) => void;
  readonly defaultName?: string;
}) {
  const [kind, setKind] = useState<SignatureValue["kind"]>("draw");
  const [text, setText] = useState(defaultName ?? "");
  const [upload, setUpload] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drawn = useRef(false);

  useEffect(() => {
    if (kind === "type") onChange(text.trim() ? { kind, text } : null);
    if (kind === "upload") onChange(upload ? { kind, image: upload } : null);
    if (kind === "draw") {
      onChange(
        drawn.current && canvas.current
          ? { kind, image: canvas.current.toDataURL("image/png") }
          : null,
      );
    }
    // onChange is the parent's setter; re-running on its identity is noise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, text, upload]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const scaleX = event.currentTarget.width / box.width;
    const scaleY = event.currentTarget.height / box.height;
    return {
      x: (event.clientX - box.left) * scaleX,
      y: (event.clientY - box.top) * scaleY,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#1f2937";
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    drawn.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (drawn.current && canvas.current) {
      onChange({ kind: "draw", image: canvas.current.toDataURL("image/png") });
    }
  }

  function clear() {
    const context = canvas.current?.getContext("2d");
    if (context && canvas.current) {
      context.clearRect(0, 0, canvas.current.width, canvas.current.height);
    }
    drawn.current = false;
    onChange(null);
  }

  function pick(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > MAX_BYTES) {
      setUploadError(m.uploadHint);
      setUpload(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUpload(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <Segmented
        value={kind}
        onChange={(value) => setKind(value as SignatureValue["kind"])}
        options={(["draw", "type", "upload"] as const).map((value) => ({
          value,
          label: m.methods[value],
        }))}
      />
      {kind === "draw" && (
        <div>
          <canvas
            ref={canvas}
            width={600}
            height={200}
            aria-label={m.methods.draw}
            className="w-full touch-none rounded border border-dashed bg-white"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
          <Button size="small" className="mt-1" onClick={clear}>
            {m.clear}
          </Button>
        </div>
      )}
      {kind === "type" && (
        <div>
          <Input
            value={text}
            maxLength={100}
            placeholder={m.typePlaceholder}
            aria-label={m.typePlaceholder}
            onChange={(event) => setText(event.target.value)}
          />
          {text.trim() && (
            <div className="mt-2 rounded border bg-white p-3 text-center text-2xl font-semibold">
              {text}
            </div>
          )}
        </div>
      )}
      {kind === "upload" && (
        <div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            aria-label={m.methods.upload}
            onChange={(event) => pick(event.target.files?.[0])}
          />
          <Text type={uploadError ? "danger" : "secondary"} className="block text-xs">
            {uploadError ?? m.uploadHint}
          </Text>
          {upload && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={upload}
              alt={m.methods.upload}
              className="mt-2 max-h-24 rounded border bg-white"
            />
          )}
        </div>
      )}
    </div>
  );
}
