import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/HomeExperience";

export const metadata: Metadata = {
  title: { absolute: "FARØN — PROJECT 001 — VEIL · Beyond the visible" },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeExperience />;
}
