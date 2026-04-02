import { test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_CONVERT_TO_PARTIAL } from "../../specNames";

const PRODUCTS_PATH = "products";
const PRODUCT_CREATED_STATUS = 201;
const GENERATED_EXAMPLE_NAME = "createProduct_201_1";

test.describe("Example Generation", () => {
  test(
    `Convert generated example to partial for '${PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_CONVERT_TO_PARTIAL}'`,
    { tag: ["@examples", "@convertToPartial", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_CONVERT_TO_PARTIAL,
      );

      await examplePage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_CONVERT_TO_PARTIAL,
      );

      await examplePage.deleteGeneratedExamples();
      await examplePage.generateExampleAndViewDetailsForPath(
        PRODUCTS_PATH,
        PRODUCT_CREATED_STATUS,
      );
      await examplePage.convertCurrentExampleToPartialAndAssert(
        GENERATED_EXAMPLE_NAME,
      );
    },
  );
});
