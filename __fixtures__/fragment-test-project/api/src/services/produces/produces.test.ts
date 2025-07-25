import type { Produce } from "@prisma/client";

import {
  produces,
  produce,
  createProduce,
  updateProduce,
  deleteProduce,
} from "./produces.js";
import type { StandardScenario } from "./produces.scenarios.js";

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe("produces", () => {
  scenario("returns all produces", async (scenario: StandardScenario) => {
    const result = await produces();

    expect(result.length).toEqual(Object.keys(scenario.produce).length);
  });

  scenario("returns a single produce", async (scenario: StandardScenario) => {
    const result = await produce({ id: scenario.produce.one.id });

    expect(result).toEqual(scenario.produce.one);
  });

  scenario("creates a produce", async (scenario: StandardScenario) => {
    const result = await createProduce({
      input: {
        name: "String1940013",
        quantity: 404916,
        price: 4194637,
        region: "String",
        stallId: scenario.produce.two.stallId,
      },
    });

    expect(result.name).toEqual("String1940013");
    expect(result.quantity).toEqual(404916);
    expect(result.price).toEqual(4194637);
    expect(result.region).toEqual("String");
    expect(result.stallId).toEqual(scenario.produce.two.stallId);
  });

  scenario("updates a produce", async (scenario: StandardScenario) => {
    const original = (await produce({
      id: scenario.produce.one.id,
    })) as Produce;
    const result = await updateProduce({
      id: original.id,
      input: { name: "String2780002" },
    });

    expect(result.name).toEqual("String2780002");
  });

  scenario("deletes a produce", async (scenario: StandardScenario) => {
    const original = (await deleteProduce({
      id: scenario.produce.one.id,
    })) as Produce;
    const result = await produce({ id: original.id });

    expect(result).toEqual(null);
  });
});
