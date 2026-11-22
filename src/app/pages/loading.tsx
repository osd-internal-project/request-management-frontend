import { Skeleton } from "antd";

// Without this a server-fetched page leaves the previous one on screen until its data arrives.
export default function Loading() {
  return <Skeleton active paragraph={{ rows: 6 }} />;
}
