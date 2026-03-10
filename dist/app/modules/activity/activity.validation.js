"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityValidation = void 0;
const zod_1 = require("zod");
const getCalendar = zod_1.z.object({
    query: zod_1.z.object({
        days: zod_1.z.string().optional(),
    }),
});
exports.ActivityValidation = { getCalendar };
