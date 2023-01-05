"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidURL = void 0;
const stream_1 = __importDefault(require("stream"));
const niconicoRegexp = RegExp('https?://(?:www\\.|secure\\.|sp\\.)?nicovideo\\.jp/watch/(?<id>(?:[a-z]{2})?[0-9]+)');
const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': 'https://www.nicovideo.jp',
    Connection: 'keep-alive',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Safari/537.36 Edg/89.0.774.45',
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    Origin: 'https://www.nicovideo.jp',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    Referer: 'https://www.nicovideo.jp/',
    'Accept-Language': 'ja,en;q=0.9,en-GB;q=0.8,en-US;q=0.7',
};
function isValidURL(url) {
    return niconicoRegexp.test(url);
}
exports.isValidURL = isValidURL;
const dataMatcher = /data-api-data="([^"]+)"/;
class NiconicoDL {
    constructor(url, quality = 'high') {
        this.heartBeatBeforeTime = 0;
        if (!isValidURL(url)) {
            throw Error('Invalid url');
        }
        this.videoURL = url;
        this.quality = quality;
    }
    async getVideoInfo() {
        const response = await fetch(this.videoURL, { headers });
        const data = await response.text();
        const match = data.match(dataMatcher);
        if (!match) {
            throw Error('Failed get video site html...');
        }
        const patterns = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x60;': '`',
        };
        const fixedString = match[1].replace(/&(lt|gt|amp|quot|#x27|#x60);/g, function (match) {
            return patterns[match];
        });
        this.data = JSON.parse(fixedString);
        return Object.assign(this.data.video, {
            owner: this.data.owner,
        });
    }
    async prepareHeartBeat() {
        if (!this.data) {
            await this.getVideoInfo();
        }
        const session = this.data.media.delivery.movie.session;
        let videoQualityNum = 0;
        let audioQualityNum = 0;
        if (this.quality === 'low') {
            videoQualityNum = session.videos.length - 1;
            audioQualityNum = session.audios.length - 1;
        }
        else {
            session.videos.forEach((video, index) => {
                if ((video.includes('720') && this.quality === 'high') ||
                    (video.includes('480') && this.quality === 'middle')) {
                    videoQualityNum = index;
                }
            });
        }
        return {
            session: {
                content_type: 'movie',
                content_src_id_sets: [
                    {
                        content_src_ids: [
                            {
                                src_id_to_mux: {
                                    video_src_ids: [session.videos[videoQualityNum]],
                                    audio_src_ids: [session.audios[audioQualityNum]],
                                },
                            },
                        ],
                    },
                ],
                timing_constraint: 'unlimited',
                keep_method: {
                    heartbeat: {
                        lifetime: session.heartbeatLifetime,
                    },
                },
                recipe_id: session.recipeId,
                priority: session.priority,
                protocol: {
                    name: 'http',
                    parameters: {
                        http_parameters: {
                            parameters: {
                                http_output_download_parameters: {
                                    use_well_known_port: session.urls[0].isWellKnownPort
                                        ? 'yes'
                                        : 'no',
                                    use_ssl: session.urls[0].isSsl ? 'yes' : 'no',
                                    transfer_preset: '',
                                },
                            },
                        },
                    },
                },
                content_uri: '',
                session_operation_auth: {
                    session_operation_auth_by_signature: {
                        token: session.token,
                        signature: session.signature,
                    },
                },
                content_id: session.contentId,
                content_auth: {
                    auth_type: session.authTypes.http,
                    content_key_timeout: session.contentKeyTimeout,
                    service_id: 'nicovideo',
                    service_user_id: session.serviceUserId,
                },
                client_info: {
                    player_id: session.playerId,
                },
            },
        };
    }
    async startHeartBeat() {
        const heartBeatData = await this.prepareHeartBeat();
        this.result = JSON.parse(await (await fetch('https://api.dmc.nico/api/sessions?_format=json', {
            method: 'POST',
            headers,
            body: JSON.stringify(heartBeatData),
        })).text()).data;
        const session_id = this.result.session.id;
        this.heartBeatBeforeTime = Math.floor(new Date().getTime() / 1000);
        this.heartBeat = setInterval(async () => {
            const now = Math.floor(new Date().getTime() / 1000);
            if (now > this.heartBeatBeforeTime + 30) {
                const res = await fetch(`https://api.dmc.nico/api/sessions/${session_id}?_format=json&_method=PUT`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(this.result),
                });
                if (res.status == 201 || res.status == 200) {
                    this.result = JSON.parse(await res.text()).data;
                }
                else {
                    throw Error;
                }
                this.heartBeatBeforeTime = now;
            }
        }, 1000);
    }
    async getDownloadLink() {
        if (!this.heartBeat) {
            await this.startHeartBeat();
        }
        return this.result.session.content_uri;
    }
    async download(autoStopHeartBeat = true) {
        const url = await this.getDownloadLink();
        const mp4Headers = Object.assign(headers, { 'Content-Type': 'video/mp4' });
        const res = await fetch(url, {
            headers: mp4Headers,
        });
        const binary = stream_1.default.Readable.fromWeb(res.body);
        if (autoStopHeartBeat) {
            binary.once('finish', () => {
                this.stop();
            });
        }
        return binary;
    }
    stop() {
        if (this.heartBeat) {
            clearInterval(this.heartBeat);
        }
    }
}
exports.default = NiconicoDL;
//# sourceMappingURL=index.js.map