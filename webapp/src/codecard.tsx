import * as React from "react";
import * as sui from "./sui";
import * as data from "./data";
import * as cloud from "./cloud";
import { fireClickOnEnter } from "./util";
import * as workspace from "./workspace";
import * as core from "./core";

const repeat = pxt.Util.repeatMap;

export interface CodeCardState {
    currentTime?: number;
}

interface CodeCardProps extends pxt.CodeCard {
    tallCard?: boolean;
}

export class CodeCardView extends data.Component<CodeCardProps, CodeCardState> {

    public element: HTMLDivElement;
    private timeUpdateInterval: any;

    constructor(props: pxt.CodeCard) {
        super(props);

        this.state = {
            currentTime: Date.now()
        };
    }

    private static observer: IntersectionObserver;
    private static setupIntersectionObserver() {
        if (this.observer) return;
        // setup intersection observer for the image
        const preloadImage = (el: HTMLImageElement) => {
            const lazyImageUrl = el.getAttribute('data-src');
            el.style.backgroundImage = `url(${lazyImageUrl})`
        }
        const config = {
            // If the image gets within 50px in the Y axis, start the download.
            rootMargin: '50px 0px',
            threshold: 0.01
        };
        const onIntersection: IntersectionObserverCallback = (entries) => {
            entries.forEach(entry => {
                // Are we in viewport?
                if (entry.intersectionRatio > 0) {
                    // Stop watching and load the image
                    this.observer.unobserve(entry.target);
                    preloadImage(entry.target as HTMLImageElement);
                }
            })
        }
        this.observer = new IntersectionObserver(onIntersection, config);
    }

    componentDidMount() {
        const lazyImage = this.refs.lazyimage as HTMLImageElement;
        if (!lazyImage) return;

        if (!('IntersectionObserver' in window)) {
            // No intersection observer support, set the image url immediately
            const lazyImageUrl = lazyImage.getAttribute('data-src');
            lazyImage.style.backgroundImage = `url(${lazyImageUrl})`
        } else {
            CodeCardView.setupIntersectionObserver();
            CodeCardView.observer.observe(lazyImage);
        }

        // Update the time every minute to refresh the "last updated" display
        this.timeUpdateInterval = setInterval(() => {
            this.setState({ currentTime: Date.now() });
        }, 60000); // Update every minute
    }

    componentWillUnmount() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
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

    renderCore() {
        const card = this.props
        let color = card.color || "";
        
        // Handler for cloud save button
        const handleCloudSave = async (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent card click
            e.preventDefault();
            
            if (!card.projectId) return;
            
            try {
                const header = this.getData<pxt.workspace.Header>(`header:${card.projectId}`);
                if (!header) {
                    core.errorNotification(lf("Project not found"));
                    return;
                }
                
                // Get the project text/files
                const text = await workspace.getTextAsync(header.id);
                
                // Create project structure for export
                const project = {
                    meta: {
                        cloudId: pxt.CLOUD_ID + pxt.appTarget.id,
                        targetVersions: pxt.appTarget.versions,
                        editor: header.editor,
                        name: header.name
                    },
                    source: JSON.stringify(text, null, 2)
                };
                
                // Compress the project
                const compressed = await pxt.lzmaCompressAsync(JSON.stringify(project, null, 2));
                
                // Import the cloud save handler dynamically
                const cloudSave = await import("./ctrl-alt-code-custom/cloudSaveButton");
                await cloudSave.handleCloudSaveWithData(header.name, compressed, header);
                
                // Invalidate the cached header data to force re-fetch
                data.invalidate(`header:${card.projectId}`);
                
                // Force a refresh of the card component
                this.forceUpdate();
            } catch (error) {
                console.error("Failed to save to cloud:", error);
            }
        };
        const renderMd = (md: string) => md.replace(/`/g, '');
        const url = card.url ? /^[^:]+:\/\//.test(card.url) ? card.url : ('/' + card.url.replace(/^\.?\/?/, ''))
            : undefined;
        const className = card.className;
        const cardType = card.cardType;
        const tutorialDone = card.tutorialLength == card.tutorialStep + 1;

        const descriptions = card && card.description && card.description.split("\n");

        const clickHandler = card.onClick ? (e: any) => {
            if (e.target && e.target.tagName == "A")
                return;
            pxt.setInteractiveConsent(true);
            card.onClick(e);
        } : undefined;

        const keydownHandler = (e: React.KeyboardEvent) => {
            const charCode = (typeof e.which == "number") ? e.which : e.keyCode;
            if (charCode === /*enter*/13 || charCode === /*space*/32) {
                clickHandler(e);
            }
        }

        const imageUrl = card.imageUrl || (card.youTubeId ? `https://img.youtube.com/vi/${card.youTubeId}/0.jpg` : undefined);

        // these header-derived properties must be taken from the virtual API system, not the props. Otherwise
        // they won't update dynamically when headers change.
        const header = card.projectId ? this.getData<pxt.workspace.Header>(`header:${card.projectId}`) : null;
        const name = header ? header.name : card.name;
        const cloudMd = card.projectId ? this.getData<cloud.CloudTempMetadata>(`${cloud.HEADER_CLOUDSTATE}:${card.projectId}`) : null;
        const cloudStatus = cloudMd?.cloudStatus();
        const lastCloudSave = cloudStatus ? Math.min(header.cloudLastSyncTime, header.modificationTime) : card.time;
        const cloudShowTimestamp = cloudStatus && (cloudStatus.value === "synced" || cloudStatus.value === "justSynced" || cloudStatus.value === "localEdits");
        
        // Check if ctrlAltCode cloud sync is outdated (has local changes not synced)
        // Use header data if available (dynamically updated), otherwise fall back to card props
        // Show as outdated if: never synced (no ctrlAltCodeCloudSyncTime) OR synced but modified since
        const ctrlAltCodeOutdated = header
            ? (header.modificationTime && (!header.ctrlAltCodeCloudSyncTime || header.ctrlAltCodeCloudSyncTime < header.modificationTime))
            : (card.time && (!card.ctrlAltCodeCloudSyncTime || card.ctrlAltCodeCloudSyncTime < card.time));

        const ariaLabel = card.ariaLabel || card.title || card.shortName || name;
        const ariaExpanded = !card.directOpen && card.selected !== undefined ? card.selected : undefined;

        const style = card.style || "card"

        const renderButton = (content: JSX.Element) => {
            return (<div className={`ui ${style} ${color} ${card.onClick ? "link" : ''} ${className ? className : ''}`}
                style={ctrlAltCodeOutdated ? { backgroundColor: '#ffe0e0' } : undefined}
                role={card.role} aria-selected={card.role === "option" ? "true" : undefined} aria-label={ariaLabel} aria-expanded={ariaExpanded} title={card.title}
                onClick={clickHandler} tabIndex={card.onClick ? card.tabIndex || 0 : null} onKeyDown={keydownHandler}>{content}</div>)
        }
        const renderLink = (content: JSX.Element) => {
            return (<a href={url} className={`ui ${style} ${color} link ${className ? className : ''}`}
                style={ctrlAltCodeOutdated ? { backgroundColor: '#ffe0e0' } : undefined}
                aria-label={ariaLabel} aria-expanded={ariaExpanded} title={card.title}>{content}</a>)
        }

        const cardContent = <>
            {card.header ?
                <div key="header" className={"ui content " + (card.responsive ? " tall desktop only" : "")}>
                    {card.header}
                </div> : null}
            {card.label || card.labelIcon || card.blocksXml || card.typeScript || imageUrl || cardType == "file" ? <div className={"ui image"}>
                {card.label || card.labelIcon ?
                    <label role={card.onLabelClicked ? 'button' : undefined} onClick={card.onLabelClicked}
                        className={`ui ${card.labelClass ? card.labelClass : "orange right ribbon"} label`}
                        aria-label={`${ariaLabel} ${card.onLabelClicked ? "button" : "label"}`}
                    >
                        {card.labelIcon ? <sui.Icon icon={card.labelIcon} /> : card.label}
                    </label> : undefined}
                {card.typeScript ? <pre key="promots">{card.typeScript}</pre> : undefined}
                {card.cardType != "file" && imageUrl ? <div className="ui imagewrapper" aria-hidden={true} role="presentation">
                    <div className={`ui cardimage`} data-src={imageUrl} ref="lazyimage" aria-hidden={true} role="presentation" />
                </div> : undefined}
                {card.cardType == "file" && !imageUrl ? <div className="ui fileimage" /> : undefined}
                {card.cardType == "file" && imageUrl ? <div className="ui fileimage" data-src={imageUrl} ref="lazyimage" /> : undefined}
            </div> : undefined}
            {card.icon || card.iconContent ?
                <div className="ui imagewrapper" aria-hidden={true} role="presentation">
                    <div className={`ui button massive fluid ${card.iconColor} ${card.iconContent ? "iconcontent" : ""}`}
                        aria-hidden={true} role="presentation" >
                        {card.icon ? <sui.Icon icon={`${'icon ' + card.icon}`} /> : undefined}
                        {card.iconContent || undefined}
                    </div>
                </div> : undefined}
            {(card.shortName || name || descriptions) ?
                <div className={`content ${this.props.tallCard? "tall" : ""}`}>
                    {card.shortName || name ? <div className="header">{card.shortName || name}
                            <div className="tags">{card.tags?.join(" ")}</div>
                        </div> : null}
                    {descriptions && descriptions.map((element, index) => {
                        return <div key={`line${index}`} className={`description tall ${card.icon || card.iconContent || card.imageUrl ? "" : "long"}`}>{renderMd(element)}</div>
                    })
                    }
                </div> : undefined}
            {card.time ? <div className="meta">
                {card.tutorialLength ? <span className={`ui tutorial-progress ${tutorialDone ? "green" : "not-finished"} left floated label`}><i className={`${tutorialDone ? "trophy" : "circle"} icon`}></i>&nbsp;{lf("{0}/{1}", (card.tutorialStep || 0) + 1, card.tutorialLength)}</span> : undefined}
                {!cloudStatus && card.time && <span key="date" className="date">{pxt.Util.timeSince(card.time)}</span>}
                {cloudStatus && cloudShowTimestamp &&
                    <span key="date" className={`date ${card.tutorialLength ? "small-screen hide" : ""}`}>{pxt.Util.timeSince(lastCloudSave)}{cloudStatus.indicator}</span>
                }
                {cloudStatus && !cloudShowTimestamp &&
                    <span key="date" className="date">{cloudStatus.indicator}</span>
                }
                {card.ctrlAltCodeCloudSyncTime && <div key="clouddate" className="date" title={lf("Last synced to Ctrl-Alt-Code cloud")}>{pxt.Util.timeSince(card.ctrlAltCodeCloudSyncTime)}<i className="ui icon cloud right floated"></i></div>}
                {cloudStatus &&
                    // TODO: alternate icons depending on state
                    <i className="ui large right floated icon cloud"></i>
                }
            </div> : undefined}
            {card.extracontent || card.learnMoreUrl || card.buyUrl || card.feedbackUrl || ctrlAltCodeOutdated ?
                <div className="ui extra content mobile hide">
                    {ctrlAltCodeOutdated && card.projectId && (
                        <div style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.65rem',
                            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 152, 0, 0.08) 100%)',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 193, 7, 0.25)',
                            margin: '0',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{
                                fontSize: '0.8em',
                                fontWeight: '600',
                                color: 'var(--pxt-warning-foreground, #f57c00)',
                                marginBottom: '0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.4rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <i className="ui icon exclamation triangle" style={{ margin: 0, fontSize: '0.9em' }}></i>
                                    {lf("Local changes not saved")}
                                </div>
                                {header && header.ctrlAltCodeCloudSyncTime && header.modificationTime && (
                                    <div style={{
                                        fontSize: '0.85em',
                                        fontWeight: '500',
                                        color: 'var(--pxt-neutral-foreground2, #666)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    }}>
                                        <i className="ui icon clock outline" style={{ margin: 0, fontSize: '0.9em' }}></i>
                                        {this.getOutOfDateText(header.ctrlAltCodeCloudSyncTime, header.modificationTime)}
                                    </div>
                                )}
                            </div>
                            <a className="ui button primary fluid compact"
                               onClick={handleCloudSave}
                               style={{
                                   cursor: 'pointer',
                                   fontWeight: '600',
                                   fontSize: '0.9em',
                                   padding: '0.65em 1em',
                                   boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                   width: '100%',
                                   display: 'block'
                               }}
                               aria-label={lf("Save local changes to the cloud")}
                               title={lf("Save local changes to the cloud")}>
                                <i className="ui icon cloud upload"></i>
                                {lf("Save to Cloud")}
                            </a>
                        </div>
                    )}
                    {card.extracontent}
                    {card.buyUrl ?
                        <a className="learnmore left floated" href={card.buyUrl}
                            aria-label={lf("Buy")} target="_blank" rel="noopener noreferrer">
                            {lf("Buy")}
                        </a> : undefined}
                    {card.learnMoreUrl ?
                        <a className="learnmore right floated" href={card.learnMoreUrl}
                            tabIndex={0}
                            aria-label={lf("Learn more")} target="_blank" rel="noopener noreferrer">
                            {lf("Learn more")}
                        </a> : undefined}
                    {card.feedbackUrl ?
                        <a className="learnmore right floated" href={card.feedbackUrl}
                            aria-label={lf("Feedback")} target="_blank" rel="noopener noreferrer">
                            {lf("Feedback")}
                        </a> : undefined}
                </div> : undefined}
        </>;

        if (!card.onClick && url) {
            return (renderLink(cardContent))
        } else {
            return (renderButton(cardContent))
        }
    }
}
