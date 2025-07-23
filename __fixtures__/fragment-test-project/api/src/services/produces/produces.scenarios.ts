import type { Prisma, Produce } from "@prisma/client";

import type { ScenarioData } from "@cedarjs/testing/api";

export const standard = defineScenario<Prisma.ProduceCreateArgs>({
  produce: {
    one: {
      data: {
        name: "String4372567",
        quantity: 5121815,
        price: 1146204,
        region: "String",
        stall: { create: { name: "String", stallNumber: "String4356419" } },
      },
    },
    two: {
      data: {
        name: "String1795238",
        quantity: 2348895,
        price: 3710401,
        region: "String",
        stall: { create: { name: "String", stallNumber: "String8563946" } },
      },
    },
  },
});

export type StandardScenario = ScenarioData<Produce, "produce">;
