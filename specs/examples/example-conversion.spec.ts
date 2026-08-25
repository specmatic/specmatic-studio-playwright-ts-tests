import { defineExampleConversionTests } from "./example-conversion";
import { test } from "../../utils/eyesFixture";
import {
  EXAMPLE_CONVERSION_ASYNC_V2_SPEC,
  EXAMPLE_CONVERSION_ASYNC_V3_SPEC,
  EXAMPLE_CONVERSION_OPENAPI_SPEC,
} from "../specNames";

test.describe.configure({ mode: "serial" });
defineExampleConversionTests({
  title: "OpenAPI",
  spec: EXAMPLE_CONVERSION_OPENAPI_SPEC,
  protocol: "openapi",
  externalNames: {
    copy: "import-copy.json",
    move: "import-move.json",
    warning: "import-lossy.json",
    unimportable: "import-unimportable.json",
  },
  warningReason: /security scheme.*Authorization/i,
  unimportableReason: /matcher|external examples/i,
});

defineExampleConversionTests({
  title: "AsyncAPI 2.x",
  spec: EXAMPLE_CONVERSION_ASYNC_V2_SPEC,
  protocol: "async",
  externalNames: {
    copy: "import-copy.json",
    move: "import-move.json",
    unimportable: "import-unimportable.json",
  },
  unimportableReason: /message key|external examples/i,
});

defineExampleConversionTests({
  title: "AsyncAPI 3.x",
  spec: EXAMPLE_CONVERSION_ASYNC_V3_SPEC,
  protocol: "async",
  externalNames: {
    copy: "import-copy.json",
    move: "import-move.json",
    unimportable: "import-unimportable.json",
  },
  unimportableReason: /message key|external examples/i,
});
