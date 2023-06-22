export default {
	files: ["test/**/*", "!test/mockApi.ts"],
	extensions: {
		ts: "module",
	},
	nonSemVerExperiments: {
		configurableModuleFormat: true,
	},
	nodeArguments: ["--loader=ts-node/esm"],
};
