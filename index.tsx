/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { PermissionsBits } from "@webpack/common";
import { PermissionStore, UserStore } from "webpack/common/stores";

import settings from "./settings";
import { VoiceState, VoiceStateUpdateEvent } from "./types/events";

const { selectVoiceChannel }: {
    selectVoiceChannel(channelId: string): void;
} = findByPropsLazy("selectVoiceChannel", "selectChannel");

const { setServerMute, setServerDeaf }: {
    setServerMute(guildId: string, userId: string, mute: boolean): void;
    setServerDeaf(guildId: string, userId: string, deaf: boolean): void;
} = findByPropsLazy("setServerMute", "setServerDeaf");

export default definePlugin({
    name: "AutoVoiceProtect",
    description: "Automatically protect YOU in a voice channels from being kicked or muted.",
    authors: [
        {
            name: "nicola02nb",
            id: 257900031351193600n
        },
        {
            name: "IMXNOOBX",
            id: 652969127756955658n
        },
    ],
    settings,
    flux: {
        TRACK: track,
        VOICE_STATE_UPDATES: voiceStateUpdate
    },
    start: () => {
    },
    stop: () => {
    }
});

let callButtonClicked = false;
let oldChannelId: string | null = null;
let currentChannelId: string | null = null;

function track(event: any) {
    if (event.event === "call_button_clicked")
        callButtonClicked = true;

    if (event.event === "leave_voice_channel") {
        if (
            settings.store.protectFromDisconnect
            && !callButtonClicked
            && !currentChannelId
        )
            joinVoiceChannel(oldChannelId!);

        callButtonClicked = false;
    }

    if (event.event === "join_voice_channel") {
        if (
            settings.store.protectFromMove
            && event.properties.was_moved
        )
            joinVoiceChannel(oldChannelId!);
    }
}

function voiceStateUpdate(event: VoiceStateUpdateEvent) {
    const userId = UserStore.getCurrentUser().id;

    for (const voiceState of event.voiceStates) {
        if (voiceState.userId !== userId)
            continue;

        oldChannelId = voiceState.oldChannelId || null;
        currentChannelId = voiceState.channelId || null;

        handleUnwantedVoiceStateUpdate(voiceState);
    }
}

function handleUnwantedVoiceStateUpdate(voiceState: VoiceState) {
    if (
        settings.store.protectFromMute
        && voiceState.mute
        && PermissionStore.canWithPartialContext(PermissionsBits.MUTE_MEMBERS, { channelId: voiceState.channelId! })
    )
        setServerMute(voiceState.guildId, voiceState.userId, false);

    if (
        settings.store.protectFromDeaf
        && voiceState.deaf
        && PermissionStore.canWithPartialContext(PermissionsBits.DEAFEN_MEMBERS, { channelId: voiceState.channelId! })
    )
        setServerDeaf(voiceState.guildId, voiceState.userId, false);
}

function joinVoiceChannel(channelId: string) {
    if (!PermissionStore.canWithPartialContext(PermissionsBits.CONNECT, { channelId: channelId }))
        return;

    selectVoiceChannel(channelId);
}
