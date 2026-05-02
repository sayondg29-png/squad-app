export type StatusKind = "here" | "otw" | "late" | "not_coming" | "idle";

export interface SquadStatus {
  kind: StatusKind;
  etaMinutes?: number;
  note?: string;
  updatedAt: number; // ms
}

export interface Member {
  id: string;
  name: string;
  color: string; // avatar bg hsl
  avatarDataUrl?: string;
  status: SquadStatus;
  isMe?: boolean;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  paidBy: string; // member id
  splitWith: string[]; // member ids (includes payer if they share)
  createdAt: number;
}

export interface LateLog {
  id: string;
  memberId: string;
  minutes: number;
  event: string;
  note?: string;
  createdAt: number;
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  createdAt: number;
}
