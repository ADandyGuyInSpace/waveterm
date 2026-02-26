// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Block } from "@/app/block/block";
import { CenteredDiv } from "@/element/quickelems";
import { ContentRenderer, NodeModel, PreviewRenderer, TileLayout } from "@/layout/index";
import { TileLayoutContents } from "@/layout/lib/types";
import { atoms, createBlock, getApi, getSettingsKeyAtom } from "@/store/global";
import * as services from "@/store/services";
import * as WOS from "@/store/wos";
import { fireAndForget, makeIconClass } from "@/util/util";
import clsx from "clsx";
import { atom, useAtomValue } from "jotai";
import * as React from "react";
import { useCallback, useMemo } from "react";

const tileGapSizeAtom = atom((get) => {
    const settings = get(atoms.settingsAtom);
    const minimalMode = settings?.["window:minimalmode"] ?? false;
    if (minimalMode && settings["window:tilegapsize"] == null) {
        return 2;
    }
    return settings["window:tilegapsize"];
});

const MinimalEmptyState = React.memo(() => {
    const quickActions = [
        { label: "Terminal", icon: "terminal", view: "term" },
        { label: "Web", icon: "globe", view: "web" },
        { label: "Files", icon: "file", view: "preview" },
        { label: "AI Chat", icon: "sparkles", view: "waveai" },
    ];

    const handleCreate = useCallback((view: string) => {
        fireAndForget(() => createBlock({ meta: { view } }));
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full gap-6 select-none">
            <div className="text-secondary text-[13px] font-medium opacity-50">Open a block to get started</div>
            <div className="flex flex-row gap-3">
                {quickActions.map((action) => (
                    <div
                        key={action.view}
                        className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl cursor-pointer transition-all text-secondary hover:text-white hover:bg-white/5"
                        onClick={() => handleCreate(action.view)}
                    >
                        <i className={clsx(makeIconClass(action.icon, true), "text-[20px]")} />
                        <span className="text-[11px]">{action.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});
MinimalEmptyState.displayName = "MinimalEmptyState";

const TabContent = React.memo(({ tabId }: { tabId: string }) => {
    const oref = useMemo(() => WOS.makeORef("tab", tabId), [tabId]);
    const loadingAtom = useMemo(() => WOS.getWaveObjectLoadingAtom(oref), [oref]);
    const tabLoading = useAtomValue(loadingAtom);
    const tabAtom = useMemo(() => WOS.getWaveObjectAtom<Tab>(oref), [oref]);
    const tabData = useAtomValue(tabAtom);
    const tileGapSize = useAtomValue(tileGapSizeAtom);
    const minimalMode = useAtomValue(getSettingsKeyAtom("window:minimalmode")) ?? false;

    const tileLayoutContents = useMemo(() => {
        const renderContent: ContentRenderer = (nodeModel: NodeModel) => {
            return <Block key={nodeModel.blockId} nodeModel={nodeModel} preview={false} />;
        };

        const renderPreview: PreviewRenderer = (nodeModel: NodeModel) => {
            return <Block key={nodeModel.blockId} nodeModel={nodeModel} preview={true} />;
        };

        function onNodeDelete(data: TabLayoutData) {
            return services.ObjectService.DeleteBlock(data.blockId);
        }

        return {
            renderContent,
            renderPreview,
            tabId,
            onNodeDelete,
            gapSizePx: tileGapSize,
        } as TileLayoutContents;
    }, [tabId, tileGapSize]);

    let innerContent;

    if (tabLoading) {
        innerContent = <CenteredDiv>Tab Loading</CenteredDiv>;
    } else if (!tabData) {
        innerContent = <CenteredDiv>Tab Not Found</CenteredDiv>;
    } else if (tabData?.blockids?.length == 0) {
        innerContent = minimalMode ? <MinimalEmptyState /> : null;
    } else {
        innerContent = (
            <TileLayout
                key={tabId}
                contents={tileLayoutContents}
                tabAtom={tabAtom}
                getCursorPoint={getApi().getCursorPoint}
            />
        );
    }

    return (
        <div
            className={clsx(
                "flex flex-row flex-grow min-h-0 w-full items-center justify-center overflow-hidden relative",
                minimalMode ? "pt-[1px] pr-[1px]" : "pt-[3px] pr-[3px]"
            )}
        >
            {innerContent}
        </div>
    );
});

export { TabContent };
