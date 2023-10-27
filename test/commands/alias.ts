import test from "ava";
import { setupTests } from "../lib/setup";

setupTests(test);

test("test", (t) => {
	t.assert(true);
});
