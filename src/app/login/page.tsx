import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · ไปต่อ" };

export default function LoginPage() {
  return <LoginScreen />;
}
