/// <reference path="../../built/pxtlib.d.ts" />

import * as React from "react";
import * as data from "./data";
import * as sui from "./sui";
import * as githubbutton from "./githubbutton";
import * as cmds from "./cmds"
import * as identity from "./identity";
import { ProjectView } from "./app";
import { userPrefersDownloadFlagSet } from "./webusb";
import { dialogAsync, hideDialog } from "./core";
import { handleCloudSaveWithData } from "./ctrl-alt-code-custom/cloudSaveButton";

import ISettingsProps = pxt.editor.ISettingsProps;
import SimState = pxt.editor.SimState;

const enum View {
    Computer,
    Tablet,
    Mobile,
}

interface EditorToolbarState {
    compileState: "compiling" | "success" | null;
    currentTime?: number;
}

export class EditorToolbar extends data.Component<ISettingsProps, EditorToolbarState> {
    protected compileTimeout: number;
    private compileBtnDropdown: React.RefObject<sui.DropdownMenu>;
    private timeUpdateInterval: any;

    constructor(props: ISettingsProps) {
        super(props);

        this.saveProjectName = this.saveProjectName.bind(this);
        this.compile = this.compile.bind(this);
        this.saveFile = this.saveFile.bind(this);
        this.cloudSaveFile = this.cloudSaveFile.bind(this);
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.startStopSimulator = this.startStopSimulator.bind(this);
        this.toggleDebugging = this.toggleDebugging.bind(this);
        this.toggleCollapsed = this.toggleCollapsed.bind(this);
        this.cloudButtonClick = this.cloudButtonClick.bind(this);

        this.compileBtnDropdown = React.createRef();
        
        this.state = {
            compileState: null,
            currentTime: Date.now()
        };
    }

    componentDidMount() {
        // Update the time every minute to refresh the "last updated" display
        this.timeUpdateInterval = setInterval(() => {
            this.setState({ currentTime: Date.now() });
        }, 60000); // Update every minute
    }

    getOutOfDateText = (cloudSyncTime: number, modificationTime: number): string => {
        if (!cloudSyncTime) return lf("Never synced");
        if (!modificationTime) return lf("Up to date");
        
        // Calculate how out of date the cloud version is
        const diffSeconds = modificationTime - cloudSyncTime;
        
        if (diffSeconds <= 0) {
            return lf("Up to date");
        } else if (diffSeconds < 60) {
            return lf("Out of date by < 1 min");
        } else if (diffSeconds < 3600) {
            const minutes = Math.floor(diffSeconds / 60);
            return lf("Out of date by {0} min", minutes);
        } else if (diffSeconds < 86400) {
            const hours = Math.floor(diffSeconds / 3600);
            return lf("Out of date by {0} hr", hours);
        } else {
            const days = Math.floor(diffSeconds / 86400);
            return lf("Out of date by {0} day", days);
        }
    }

    getSyncStatusStyle = (cloudSyncTime: number, modificationTime: number) => {
        if (!cloudSyncTime) {
            return {
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
                borderColor: '#ffc107',
                iconColor: '#ff9800',
                textColor: '#856404',
                icon: 'exclamation triangle'
            };
        }
        
        const diffSeconds = modificationTime - cloudSyncTime;
        
        if (diffSeconds <= 0) {
            // Up to date - green
            return {
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                borderColor: '#28a745',
                iconColor: '#28a745',
                textColor: '#155724',
                icon: 'check circle'
            };
        } else if (diffSeconds < 300) {
            // Less than 5 minutes - light yellow
            return {
                background: 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)',
                borderColor: '#ffc107',
                iconColor: '#ffa000',
                textColor: '#856404',
                icon: 'clock outline'
            };
        } else if (diffSeconds < 3600) {
            // Less than 1 hour - orange
            return {
                background: 'linear-gradient(135deg, #ffe5d0 0%, #ffd8b8 100%)',
                borderColor: '#fd7e14',
                iconColor: '#f57c00',
                textColor: '#8a4100',
                icon: 'clock outline'
            };
        } else {
            // More than 1 hour - red
            return {
                background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
                borderColor: '#dc3545',
                iconColor: '#dc3545',
                textColor: '#721c24',
                icon: 'exclamation circle'
            };
        }
    }

    saveProjectName(name: string, view?: string) {
        pxt.tickEvent("editortools.projectrename", { view: view }, { interactiveConsent: true });
        this.props.parent.updateHeaderName(name);
    }

    compile(view?: string) {
        this.setState({ compileState: "compiling" });
        pxt.tickEvent("editortools.download", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        this.props.parent.compile();
    }

    saveFile(view?: string) {
        pxt.tickEvent("editortools.save", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        this.props.parent.saveAndCompile();
    }

    async cloudSaveFile(view?: string) {
        pxt.tickEvent("editortools.cloud", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        const output = await (this.props.parent as ProjectView).exportProjectToFileAsync()
        const header = this.props.parent.state.header;
        const projectName = header.name;
        await handleCloudSaveWithData(projectName, output, header);
        // Optionally also call the regular save
        // this.props.parent.saveAndCompile();
    }

    undo(view?: string) {
        pxt.tickEvent("editortools.undo", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        this.props.parent.editor.undo();
    }

    redo(view?: string) {
        pxt.tickEvent("editortools.redo", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        this.props.parent.editor.redo();
    }

    zoomIn(view?: string) {
        pxt.tickEvent("editortools.zoomIn", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        this.props.parent.editor.zoomIn();
        this.props.parent.forceUpdate();
    }

    zoomOut(view?: string) {
        pxt.tickEvent("editortools.zoomOut", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        this.props.parent.editor.zoomOut();
        this.props.parent.forceUpdate();
    }

    startStopSimulator(view?: string) {
        pxt.tickEvent("editortools.startStopSimulator", { view: view, collapsed: this.getCollapsedState(), headless: this.getHeadlessState() }, { interactiveConsent: true });
        this.props.parent.startStopSimulator({ clickTrigger: true });
    }

    toggleDebugging(view?: string) {
        pxt.tickEvent("editortools.debug", { view: view, collapsed: this.getCollapsedState(), headless: this.getHeadlessState() }, { interactiveConsent: true });
        this.props.parent.toggleDebugging();
    }

    toggleCollapsed() {
        pxt.tickEvent("editortools.portraitToggleCollapse", { collapsed: this.getCollapsedState(), headless: this.getHeadlessState() }, { interactiveConsent: true });
        this.props.parent.toggleSimulatorCollapse();
    }

    cloudButtonClick(view?: string) {
        pxt.tickEvent("editortools.cloud", { view: view, collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        // TODO: do anything?
    }

    componentDidUpdate() {
        if (this.props.parent.state.compiling) {
            if (!this.state?.compileState) {
                this.setState({ compileState: "compiling" });
            }
        }
        else if (this.state?.compileState === "compiling") {
            if (this.props.parent.state.cancelledDownload) {
                this.setState({ compileState: null });
            }
            else {
                this.setState({ compileState: "success" });
                if (this.compileTimeout) clearTimeout(this.compileTimeout);
                this.compileTimeout = setTimeout(() => {
                    if (this.state?.compileState === "success") this.setState({ compileState: null });
                }, 2000) as any;
            }
        }
    }

    componentWillUnmount() {
        if (this.compileTimeout) clearTimeout(this.compileTimeout);
        if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
    }

    private getCollapsedState(): string {
        return '' + this.props.parent.state.collapseEditorTools;
    }

    private getHeadlessState(): string {
        return pxt.appTarget.simulator.headless ? "true" : "false";
    }

    private getSaveInput(showSave: boolean, id?: string, projectName?: string, projectNameReadOnly?: boolean): JSX.Element[] {
        let saveButtonClasses = "";
        if (this.props.parent.state.isSaving) {
            saveButtonClasses = "loading disabled";
        } else if (!!this.props.parent.state.compiling) {
            saveButtonClasses = "disabled";
        }

        let saveInput = [];
        saveInput.push(<label htmlFor={id} className="accessible-hidden phone hide" key="label">{lf("Type a name for your project")}</label>);
        saveInput.push(<EditorToolbarSaveInput id={id} view={this.getViewString(View.Computer)} key="input"
            type="text"
            aria-labelledby={id}
            placeholder={lf("Pick a name...")}
            value={projectName || ''}
            onChangeValue={this.saveProjectName}
            disabled={projectNameReadOnly}
            readOnly={projectNameReadOnly}
        />)
        if (showSave) {
            saveInput.push(<EditorToolbarButton role="button" icon='save' className={`right attached editortools-btn save-editortools-btn ${saveButtonClasses}`} title={lf("Save")} ariaLabel={lf("Save the project")} onButtonClick={this.saveFile} view={this.getViewString(View.Computer)} key={`save${View.Computer}`} />)
        }

        return saveInput;
    }

    private getSaveButton(view: View): JSX.Element {
        let saveButtonClasses = this.props.parent.state.isSaving ? "loading disabled" : "";

        switch (view) {
            case View.Mobile:
                saveButtonClasses += "download-button-full ";
                break;
            case View.Tablet:
                saveButtonClasses += "download-button-full large fluid ";
                break;
            case View.Computer:
            default:
                saveButtonClasses += "large fluid ";
        }

        return (
            <EditorToolbarButton
                role="button"
                icon='cloud upload'
                text={view != View.Mobile ? "Save to Cloud" : undefined}
                className={`primary download-button custom-save-button ${saveButtonClasses}`}
                title={lf("Cloud Save")}
                ariaLabel={lf("Cloud Save")}
                onButtonClick={this.cloudSaveFile}
                view={this.getViewString(view)}
                key={`cloudsave${view}`}
            />
        );
    }

    private getZoomControl(view: View): JSX.Element[] {
        return [<EditorToolbarButton icon='minus circle' className="editortools-btn zoomout-editortools-btn" title={lf("Zoom Out")} onButtonClick={this.zoomOut} view={this.getViewString(view)} key="minus" />,
        <EditorToolbarButton icon='plus circle' className="editortools-btn zoomin-editortools-btn" title={lf("Zoom In")} onButtonClick={this.zoomIn} view={this.getViewString(view)} key="plus" />]
    }

    protected getUndoRedo(view: View): JSX.Element[] {
        const hasUndo = this.props.parent.editor.hasUndo();
        const hasRedo = this.props.parent.editor.hasRedo();
        return [
            <EditorToolbarButton icon='xicon undo' className={`editortools-btn undo-editortools-btn ${!hasUndo ? 'disabled' : ''}`} title={lf("Undo")} ariaLabel={lf("{0}, {1}", lf("Undo"), !hasUndo ? lf("Disabled") : "")} onButtonClick={this.undo} view={this.getViewString(view)} key="undo" />,
            <EditorToolbarButton icon='xicon redo' className={`editortools-btn redo-editortools-btn ${!hasRedo ? 'disabled' : ''}`} title={lf("Redo")} ariaLabel={lf("{0}, {1}", lf("Redo"), !hasRedo ? lf("Disabled") : "")} onButtonClick={this.redo} view={this.getViewString(view)} key="redo" />
        ];
    }

    protected getViewString(view: View): string {
        return view.toString().toLowerCase();
    }

    protected onHwItemClick = () => {
        if (pxt.hasHwVariants())
            this.props.parent.showChooseHwDialog(true);
        else
            this.props.parent.showBoardDialogAsync(undefined, true);

    }

    protected onDownloadButtonClick = async () => {
        pxt.tickEvent("editortools.downloadbutton", { collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        if (this.shouldShowPairingDialogOnDownload()
            && !pxt.packetio.isConnected()
            && !pxt.packetio.isConnecting()
        ) {
            await cmds.pairAsync(true);
        }
        this.compile();
    }

    protected onFileDownloadClick = async () => {
        // Matching the tick in the call to compile() above for historical reasons
        pxt.tickEvent("editortools.download", { collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        pxt.tickEvent("editortools.downloadasfile", { collapsed: this.getCollapsedState() }, { interactiveConsent: true });
        // CC_TODO
        // (this.props.parent as ProjectView).compile(true);
        // Download project files as a package instead of compiling
        await (this.props.parent as ProjectView).saveProjectToFileAsync();
    }

    protected onPairClick = () => {
        pxt.tickEvent("editortools.pair", undefined, { interactiveConsent: true });
        this.props.parent.pairAsync();
    }

    protected onCannotPairClick = async () => {
        pxt.tickEvent("editortools.pairunsupported", undefined, { interactiveConsent: true });
        const reasonUnsupported = await pxt.usb.getReasonUnavailable();

        let modalBody: string;
        switch (reasonUnsupported) {
            case "security":
                modalBody = lf("WebUSB is disabled by browser policies. Check with your admin for help.");
                break;
            case "oldwindows":
                modalBody = lf("WebUSB is not available on Windows devices with versions below 8.1.");
                break;
            case "electron":
                modalBody = lf("WebUSB is not supported in electron.");
                break;
            case "notimpl":
                modalBody = lf("WebUSB is not supported by this browser; please check for updates.");
                break;
            default:
                modalBody = lf("Unable to connect to WebUSB. Please try refreshing the page.");
                break;
        }

        dialogAsync({
            header: lf("Cannot Connect Device"),
            body: modalBody,
            hasCloseIcon: true,
            buttons: [
                {
                    label: lf("Okay"),
                    className: "primary",
                    onclick: hideDialog
                }
            ]
        });
    }

    protected onDisconnectClick = () => {
        cmds.showDisconnectAsync();
    }

    protected onHelpClick = () => {
        pxt.tickEvent("editortools.downloadhelp");
        window.open(pxt.appTarget.appTheme.downloadDialogTheme?.downloadMenuHelpURL);
    }

    protected shouldShowPairingDialogOnDownload = () => {
        return pxt.appTarget.appTheme.preferWebUSBDownload
            && pxt.appTarget?.compile?.webUSB
            && pxt.usb.isEnabled
            && !userPrefersDownloadFlagSet();
    }

    protected getCompileButton(view: View): JSX.Element[] {
        const targetTheme = pxt.appTarget.appTheme;
        const { compiling, isSaving } = this.props.parent.state;
        const { compileState } = this.state;
        const compileTooltip = lf("Download project files");

        let downloadText: string;
        if (compileState === "success") {
            downloadText = lf("Downloaded!")
        }
        else {
            downloadText = lf("Download")
        }

        const fileDownloadIcon = targetTheme.downloadIcon || "xicon file-download";
        const successIcon = "xicon file-download-check";
        const downloadIcon = (compileState === "success" && successIcon) || fileDownloadIcon;

        let downloadButtonClasses = "";
        if (isSaving) {
            downloadButtonClasses += "disabled ";
        } else if (compiling) {
            downloadButtonClasses += "loading disabled ";
        }
        
        switch (view) {
            case View.Mobile:
                downloadButtonClasses += "download-button-full ";
                break;
            case View.Tablet:
                downloadButtonClasses += "download-button-full large fluid ";
                break;
            case View.Computer:
            default:
                downloadButtonClasses += "large fluid ";
        }

        // Single button that downloads project files directly
        let el = [];
        el.push(<EditorToolbarButton
            key="downloadbutton"
            icon={downloadIcon}
            className={`primary download-button ${downloadButtonClasses}`}
            text={view != View.Mobile ? downloadText : undefined}
            title={compileTooltip}
            onButtonClick={this.onFileDownloadClick}
            view='computer'
        />)

        return el;
    }

    renderCore() {
        const { tutorialOptions, projectName, compiling, isSaving, simState, debugging, editorState } = this.props.parent.state;
        const header = this.getData(`header:${this.props.parent.state.header.id}`) ?? this.props.parent.state.header;

        const targetTheme = pxt.appTarget.appTheme;
        const isController = pxt.shell.isControllerMode();
        const isTimeMachineEmbed = pxt.shell.isTimeMachineEmbed();
        const readOnly = pxt.shell.isReadOnly();
        const tutorial = tutorialOptions ? tutorialOptions.tutorial : false;
        const hideZoomAndUndo = tutorial && tutorialOptions.metadata?.flyoutOnly; // Legacy flag that indicates Minecraft HOC (where zoom & undo are a the top)
        const hideToolbox = tutorial && tutorialOptions.metadata?.hideToolbox;

        const disableFileAccessinMaciOs = targetTheme.disableFileAccessinMaciOs && (pxt.BrowserUtils.isIOS() || pxt.BrowserUtils.isMac());
        const disableFileAccessinAndroid = pxt.appTarget.appTheme.disableFileAccessinAndroid && pxt.BrowserUtils.isAndroid();
        const ghid = header && pxt.github.parseRepoId(header.githubId);
        const hasRepository = !!ghid;
        const showSave = !readOnly && !isController && !targetTheme.saveInMenu
            && !tutorial && !debugging && !disableFileAccessinMaciOs && !disableFileAccessinAndroid
            && !hasRepository;
        const showProjectRename = !tutorial && !readOnly && !isController
            && !targetTheme.hideProjectRename && !debugging;
        const showProjectRenameReadonly = false; // always allow renaming, even for github projects
        const compile = pxt.appTarget.compile;
        const compilesToDownloadableFile = compile.hasHex || compile.saveAsPNG || compile.useUF2;
        const hasCompileButtonOverride = !!pxt.commands.onDownloadButtonClick;
        const showCompileBtn = !isTimeMachineEmbed && (compilesToDownloadableFile || hasCompileButtonOverride);
        const compileLoading = !!compiling;
        const running = simState == SimState.Running;
        const starting = simState == SimState.Starting;

        const showUndoRedo = !readOnly && !debugging && !hideZoomAndUndo && !hideToolbox;
        const showZoomControls = !hideZoomAndUndo && !hideToolbox;
        const showGithub = !!pxt.appTarget.cloud
            && !!pxt.appTarget.cloud.githubPackages
            && targetTheme.githubEditor
            && !pxt.BrowserUtils.isPxtElectron()
            && !readOnly && !isController && !debugging && !tutorial;

        const bigRunButtonTooltip = (() => {
            switch (simState) {
                case SimState.Stopped:
                    return lf("Start");
                case SimState.Pending:
                case SimState.Starting:
                    return lf("Starting");
                default:
                    return lf("Stop");
            }
        })();

        const mobile = View.Mobile;
        const computer = View.Computer;

        let downloadButtonClasses = "";
        let saveButtonClasses = "";
        if (isSaving) {
            downloadButtonClasses = "disabled";
            saveButtonClasses = "loading disabled";
        } else if (compileLoading) {
            downloadButtonClasses = "loading disabled";
            saveButtonClasses = "disabled";
        }

        return <div id="editortools" className="ui" role="region" aria-label={lf("Editor toolbar")}>
            <div id="downloadArea" role="menubar" className="ui column items" style={{ flex: '0 0 auto' }}>
                {showCompileBtn && <div className="ui item portrait hide">
                    {this.getCompileButton(computer)}
                </div>}
                {showCompileBtn && <div className="ui portrait only">
                    {this.getCompileButton(mobile)}
                </div>}
            </div>
            <div id="saveArea" role="menubar" className="ui column items" style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%' }}>
                {showCompileBtn && <div className="ui item portrait hide" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '1rem', width: '100%', maxWidth: '100%' }}>
                        <div style={{ flex: '0 0 auto' }}>
                            {this.getSaveButton(computer)}
                        </div>
                        {header && header.ctrlAltCodeCloudSyncTime && header.modificationTime && (() => {
                            const statusStyle = this.getSyncStatusStyle(header.ctrlAltCodeCloudSyncTime, header.modificationTime);
                            return (
                                <div style={{
                                    fontSize: '0.9rem',
                                    color: statusStyle.textColor,
                                    padding: '0.75rem 1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: statusStyle.background,
                                    borderRadius: '8px',
                                    border: `2px solid ${statusStyle.borderColor}`,
                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    whiteSpace: 'nowrap',
                                    flex: '0 1 auto',
                                    maxWidth: '400px',
                                    minWidth: 'fit-content',
                                    minHeight: '100%',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    cursor: 'default',
                                    position: 'relative',
                                    overflow: 'visible'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 5px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)';
                                }}
                                >
                                    <i className={`ui icon ${statusStyle.icon}`} style={{
                                        margin: 0,
                                        fontSize: '1.1rem',
                                        color: statusStyle.iconColor,
                                        opacity: 1,
                                        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
                                    }}></i>
                                    <span style={{
                                        fontWeight: 600,
                                        letterSpacing: '0.015em',
                                        color: statusStyle.textColor
                                    }}>
                                        {this.getOutOfDateText(header.ctrlAltCodeCloudSyncTime, header.modificationTime)}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>}
                {showCompileBtn && <div className="ui portrait only">
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {this.getSaveButton(mobile)}
                        {header && header.ctrlAltCodeCloudSyncTime && header.modificationTime && (() => {
                            const statusStyle = this.getSyncStatusStyle(header.ctrlAltCodeCloudSyncTime, header.modificationTime);
                            return (
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: statusStyle.textColor,
                                    marginTop: '0.625rem',
                                    padding: '0.625rem 1rem',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: statusStyle.background,
                                    borderRadius: '8px',
                                    border: `2px solid ${statusStyle.borderColor}`,
                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <i className={`ui icon ${statusStyle.icon}`} style={{
                                        margin: 0,
                                        fontSize: '1rem',
                                        color: statusStyle.iconColor,
                                        opacity: 1
                                    }}></i>
                                    <span style={{
                                        fontWeight: 600,
                                        letterSpacing: '0.02em',
                                        color: statusStyle.textColor
                                    }}>
                                        {this.getOutOfDateText(header.ctrlAltCodeCloudSyncTime, header.modificationTime)}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>}
            </div>
            {/* {(showProjectRename || showGithub || identity.CloudSaveStatus.wouldRender(header.id)) &&
                <div id="projectNameArea" className="ui column items">
                    <div className={`ui right ${showSave ? "labeled" : ""} input projectname-input projectname-computer`}>
                        {showProjectRename && this.getSaveInput(showSave, "fileNameInput2", projectName, showProjectRenameReadonly)}
                        {showGithub && <githubbutton.GithubButton parent={this.props.parent} key={`githubbtn${computer}`} />}
                        <identity.CloudSaveStatus headerId={header.id} />
                    </div>
                </div>} */}
            <div id="editorToolbarArea" role="menubar" className="ui column items" style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'row',
                gap: '0.5rem',
                alignItems: 'center',
                flexWrap: 'nowrap'
            }}>
                {showUndoRedo && <div className="ui icon buttons" style={{ flexShrink: 0 }}>{this.getUndoRedo(computer)}</div>}
                {showZoomControls && <div className="ui icon buttons mobile hide" style={{ flexShrink: 0 }}>{this.getZoomControl(computer)}</div>}
                {targetTheme.bigRunButton && !pxt.shell.isTimeMachineEmbed() &&
                    <div className="big-play-button-wrapper">
                        <EditorToolbarButton
                            className={`big-play-button play-button ${running ? "stop" : "play"}`}
                            key='runmenubtn' disabled={starting}
                            icon={running ? "stop" : "play"}
                            title={bigRunButtonTooltip} onButtonClick={this.startStopSimulator}
                            view='computer'
                        />
                    </div>}
            </div>
        </div>;
    }
}

interface ZoomSliderProps extends ISettingsProps {
    view: string;
    zoomMin?: number;
    zoomMax?: number;
}

interface ZoomSliderState {
    zoomValue: number;
}

export class ZoomSlider extends data.Component<ZoomSliderProps, ZoomSliderState> {
    private zoomMin = this.props.zoomMin ? this.props.zoomMin : 0;
    private zoomMax = this.props.zoomMax ? this.props.zoomMax : 5;

    constructor(props: ZoomSliderProps) {
        super(props);
        this.state = {zoomValue: Math.floor((this.zoomMax + 1 - this.zoomMin) / 2) + this.zoomMin};

        this.handleWheelZoom = this.handleWheelZoom.bind(this);
        this.zoomUpdate = this.zoomUpdate.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
    }

    componentDidMount() {
        window.addEventListener('wheel', this.handleWheelZoom);
    }

    componentWillUnmount() {
        window.removeEventListener('wheel', this.handleWheelZoom);
    }

    handleWheelZoom(e: WheelEvent) {
        if (e.ctrlKey) {
            if (e.deltaY < 0) {
                this.increaseZoomState();
            } else {
                this.decreaseZoomState();
            }
        }
    }

    private decreaseZoomState() {
        if (this.state.zoomValue > this.zoomMin) {
            this.setState({zoomValue: this.state.zoomValue - 1});
        }
    }
    private increaseZoomState() {
        if (this.state.zoomValue < this.zoomMax) {
            this.setState({zoomValue: this.state.zoomValue + 1})
        }
    }

    zoomOut() {
        if (this.state.zoomValue > this.zoomMin) {
            this.decreaseZoomState();
            this.props.parent.editor.zoomOut();
            this.props.parent.forceUpdate();
        }
    }

    zoomIn() {
        if (this.state.zoomValue < this.zoomMax) {
            this.increaseZoomState();
            this.props.parent.editor.zoomIn();
            this.props.parent.forceUpdate();
        }
    }

    zoomUpdate(e: React.ChangeEvent<HTMLInputElement>) {
        const newZoomValue = parseInt((e.target as any).value);
        if (this.state.zoomValue < newZoomValue) {
            for (let i = 0; i < (newZoomValue - this.state.zoomValue); i++) {
                this.props.parent.editor.zoomIn();
            }
        } else if (newZoomValue < this.state.zoomValue) {
            for (let i = 0; i < (this.state.zoomValue - newZoomValue); i++) {
                this.props.parent.editor.zoomOut();
            }
        }
        this.setState({zoomValue: newZoomValue});
        this.props.parent.forceUpdate();
    }

    renderCore() {
        return <div className="zoom">
            <EditorToolbarButton icon="minus circle" className="editortools-btn zoomout-editortools-btn borderless" title={lf("Zoom Out")} onButtonClick={this.zoomOut} view={this.props.view} key="minus"/>
            <div id="zoomSlider">
                <input className="zoomSliderBar" type="range" min={this.zoomMin} max={this.zoomMax} step="1" value={this.state.zoomValue.toString()} onChange={this.zoomUpdate}
                aria-valuemax={this.zoomMax} aria-valuemin={this.zoomMin} aria-valuenow={this.state.zoomValue}></input>
            </div>
            <EditorToolbarButton icon='plus circle' className="editortools-btn zoomin-editortools-btn borderless" title={lf("Zoom In")} onButtonClick={this.zoomIn} view={this.props.view} key="plus" />
        </div>
    }
}


export class SmallEditorToolbar extends EditorToolbar {
    constructor(props: ISettingsProps) {
        super(props);
    }
    renderCore() {
        return <div id="headerToolbar" className="smallEditorToolbar">
            <ZoomSlider parent={this.props.parent} view={super.getViewString(View.Computer)} zoomMin={0} zoomMax={5}></ZoomSlider>
            <div className="ui icon undo-redo-buttons">{super.getUndoRedo(View.Computer)}</div>
        </div>
    }
}


interface EditorToolbarButtonProps extends sui.ButtonProps {
    view: string;
    onButtonClick: (view: string) => void;
}

class EditorToolbarButton extends sui.StatelessUIElement<EditorToolbarButtonProps> {
    constructor(props: EditorToolbarButtonProps) {
        super(props);
        this.state = {
        }

        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        const { onButtonClick, view } = this.props;
        onButtonClick(view);
    }

    renderCore() {
        const { onClick, onButtonClick, role, ...rest } = this.props;
        return <sui.Button role={role || "menuitem"} {...rest} onClick={this.handleClick} />;
    }
}

interface EditorToolbarSaveInputProps extends React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    view: string;
    onChangeValue: (value: string, view: string) => void;
}

interface EditorToolbarSaveInputState {
    editValue: string | undefined;
}

class EditorToolbarSaveInput extends React.Component<EditorToolbarSaveInputProps, EditorToolbarSaveInputState> {
    constructor(props: EditorToolbarSaveInputProps) {
        super(props);
        this.state = {
            editValue: undefined
        };
    }

    render() {
        const { onChange, onChangeValue, view, ...rest } = this.props;
        const { editValue } = this.state;


        return <input
            onChange={this.onChange}
            onBlur={this.onBlur}
            onKeyDown={this.onKeyDown}
            className="mobile hide ui"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            {...rest}
            value={editValue !== undefined ? editValue : this.props.value}
        />
    }

    protected onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            editValue: e.target.value
        });

        const { onChangeValue, view } = this.props;
        onChangeValue(e.target.value, view);
    }

    protected onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!this.state.editValue) return;

        const { onChangeValue, view } = this.props;
        onChangeValue(e.target.value, view);
        this.setState({
            editValue: undefined
        });
    }

    protected onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.metaKey && !e.shiftKey) {
            (e.target as HTMLInputElement).blur();
            e.stopPropagation();
        }
    }
}
