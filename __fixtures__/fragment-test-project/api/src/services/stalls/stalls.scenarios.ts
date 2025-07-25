import type { Prisma, Stall } from "@prisma/client";

import type { ScenarioData } from "@cedarjs/testing/api";

export const standard = defineScenario<Prisma.StallCreateArgs>({
  stall: {
    one: { data: { name: "String", stallNumber: "String1022393" } },
    two: { data: { name: "String", stallNumber: "String6257009" } },
  },
});

export type StandardScenario = ScenarioData<Stall, "stall">;
