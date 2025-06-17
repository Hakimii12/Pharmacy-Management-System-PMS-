export const notifications = [
  {
    id: 1,
    type: "SOLD_OUT",
    drugId: 3,
    drugName: "Amoxicillin",
    message: "Amoxicillin (Amoxil) has sold out!",
    timestamp: "2023-11-15T14:30:00",
    read: false,
    severity: "high"
  },
  {
    id: 2,
    type: "LOW_STOCK",
    drugId: 4,
    drugName: "Loratadine",
    message: "Loratadine (Claritin) is low on stock! Only 45 left.",
    timestamp: "2023-11-15T10:15:00",
    read: false,
    severity: "medium"
  },
  {
    id: 3,
    type: "NEAR_EXPIRY",
    drugId: 5,
    drugName: "Omeprazole",
    message: "Omeprazole (Prilosec) will expire in less than 30 days!",
    timestamp: "2023-11-14T16:45:00",
    read: true,
    severity: "high"
  },
  {
    id: 4,
    type: "EXPIRED",
    drugId: 5,
    drugName: "Omeprazole",
    message: "Omeprazole (Prilosec) has expired! Please remove from inventory.",
    timestamp: "2023-11-15T09:00:00",
    read: false,
    severity: "critical"
  },
  {
    id: 5,
    type: "SOLD_OUT",
    drugId: 10,
    drugName: "Diphenhydramine",
    message: "Diphenhydramine (Benadryl) is running low! Only 25 left.",
    timestamp: "2023-11-14T14:20:00",
    read: true,
    severity: "medium"
  },
  {
    id: 6,
    type: "LOW_STOCK",
    drugId: 7,
    drugName: "Simvastatin",
    message: "Simvastatin (Zocor) stock is below minimum threshold! Only 30 left.",
    timestamp: "2023-11-13T11:30:00",
    read: false,
    severity: "medium"
  },
  {
    id: 7,
    type: "NEAR_EXPIRY",
    drugId: 4,
    drugName: "Loratadine",
    message: "Loratadine (Claritin) will expire in 45 days!",
    timestamp: "2023-11-12T15:45:00",
    read: true,
    severity: "low"
  },
  {
    id: 8,
    type: "NEW_DRUG",
    drugId: 11,
    drugName: "Atorvastatin",
    message: "New drug added: Atorvastatin (Lipitor)",
    timestamp: "2023-11-12T10:10:00",
    read: true,
    severity: "info"
  }
];