export const buildConnection = (overrides = {}) => ({
  _id: "connection1",
  opportunityId: "OPP001",
  fabCircuitId: "CKT001",
  serviceType: "Internet Lease Line",
  bandwidth: "100 Mbps",
  history: [
    {
      _id: "history1",
      action: "ACTIVATED",
      date: new Date("2026-06-01"),
      commercials: {
        mrc: 10000
      },
      bandwidth: "100 Mbps",
      serviceType: "Internet Lease Line"
    }
  ],
  ...overrides
});