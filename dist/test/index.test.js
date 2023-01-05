"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var index_1 = __importDefault(require("@/index"));
function sha256Checksum(buf) {
    return (0, crypto_1.createHash)('sha256').update(buf).digest();
}
jest.setTimeout(600 * 1000);
describe('Niconico-DL.js Test by Jest', function () {
    test('try download video and validate checksum', function (done) {
        var niconico = new index_1.default(
        // 【東方アレンジ】 U.N.オーエンは彼女なのか？ -MG & GXN- 【東方紅魔郷】
        'https://www.nicovideo.jp/watch/sm28353945', 'low');
        var allData = Buffer.alloc(0);
        void niconico.download().then(function (result) {
            result.on('data', function (data) {
                allData = Buffer.concat([allData, data]);
            });
            result.on('finish', function () {
                expect(sha256Checksum(allData).toString('hex')).toBe('8496a27f98b51ab80bb134a916df5d4109535cfea2c62dc187526aa974370e9e');
                done();
            });
        });
    });
});
