const STATUS_MAP = {
  Draft:    "badge badge-Draft",
  Waiting:  "badge badge-Waiting",
  Ready:    "badge badge-Ready",
  Done:     "badge badge-Done",
  Canceled: "badge badge-Canceled",
};

const TYPE_MAP = {
  Receipt:    "badge badge-Receipt",
  Delivery:   "badge badge-Delivery",
  Internal:   "badge badge-Internal",
  Adjustment: "badge badge-Adjustment",
};

export function StatusBadge({ status }) {
  return <span className={STATUS_MAP[status] || "badge badge-Draft"}>{status}</span>;
}

export function TypeBadge({ type }) {
  return <span className={TYPE_MAP[type] || "badge badge-Draft"}>{type}</span>;
}
