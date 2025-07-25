import type { Prisma, Produce } from "@prisma/client";

import type { ScenarioData } from "@cedarjs/testing/api";

export const standard = defineScenario<Prisma.ProduceCreateArgs>({
  produce: {
    one: {
      data: {
        name: "String5899100",
        quantity: 7675914,
        price: 4275602,
        region: "String",
        stall: { create: { name: "String", stallNumber: "String1160791" } },
      },
    },
    two: {
      data: {
        name: "String242106",
        quantity: 1821444,
        price: 4034000,
        region: "String",
        stall: { create: { name: "String", stallNumber: "String6252397" } },
      },
    },
  },
});

export type StandardScenario = ScenarioData<Produce, "produce">;
