"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityValidation = void 0;
const zod_1 = require("zod");
const getCalendar = zod_1.z.object({
    query: zod_1.z.object({
        month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
        year: zod_1.z.coerce.number().int().min(2020).max(2100).optional(),
    }),
});
exports.ActivityValidation = { getCalendar };
