/// <reference types="node" />
import internal from 'stream';
export interface OwnerInfo {
    id: number;
    nickname: string;
    iconUrl: string;
    channel: string | null;
    live: {
        id: string;
        title: string;
        url: string;
        begunAt: string;
        isVideoLive: boolean;
        videoLiveOnAirStartTime: string | null;
        thumbnailUrl: string | null;
    } | null;
    isVideoPublic: boolean;
    isMylistsPublic: boolean;
    videoLiveNotice: null;
    viewer: number | null;
}
interface OriginalVideoInfo {
    id: string;
    title: string;
    description: string;
    count: {
        view: number;
        comment: number;
        mylist: number;
        like: number;
    };
    duration: number;
    thumbnail: {
        url: string;
        middleUrl: string;
        largeUrl: string;
        player: string;
        ogp: string;
    };
    rating: {
        isAdult: boolean;
    };
    registerdAt: string;
    isPrivate: boolean;
    isDeleted: boolean;
    isNoBanner: boolean;
    isAuthenticationRequired: boolean;
    isEmbedPlayerAllowed: boolean;
    viewer: null;
    watchableUserTypeForPayment: string;
    commentableUserTypeForPayment: string;
    [key: string]: any;
}
export interface VideoInfo extends OriginalVideoInfo {
    owner: OwnerInfo;
}
interface HeartBeatData {
    session: {
        content_type: string;
        content_src_id_sets: {
            content_src_ids: {
                src_id_to_mux: {
                    video_src_ids: string[];
                    audio_src_ids: string[];
                };
            }[];
        }[];
        timing_constraint: string;
        keep_method: {
            heartbeat: {
                lifetime: number;
            };
        };
        recipe_id: string;
        priority: number;
        protocol: {
            name: string;
            parameters: {
                http_parameters: {
                    parameters: {
                        http_output_download_parameters: {
                            use_well_known_port: 'yes' | 'no';
                            use_ssl: 'yes' | 'no';
                            transfer_preset: string;
                        };
                    };
                };
            };
        };
        content_uri: string;
        session_operation_auth: {
            session_operation_auth_by_signature: {
                token: string;
                signature: string;
            };
        };
        content_id: string;
        content_auth: {
            auth_type: string;
            content_key_timeout: number;
            service_id: string;
            service_user_id: string;
        };
        client_info: {
            player_id: string;
        };
    };
}
type DownloadQuality = 'high' | 'middle' | 'low';
export declare function isValidURL(url: string): boolean;
declare class NiconicoDL {
    private videoURL;
    private data;
    private heartBeat;
    private result;
    private heartBeatBeforeTime;
    private readonly quality;
    constructor(url: string, quality?: DownloadQuality);
    getVideoInfo(): Promise<VideoInfo>;
    prepareHeartBeat(): Promise<HeartBeatData>;
    startHeartBeat(): Promise<void>;
    getDownloadLink(): Promise<string>;
    download(autoStopHeartBeat?: boolean): Promise<internal.Readable>;
    stop(): void;
}
export default NiconicoDL;
