import React from 'react';
import '../styles/ImageViewer.css';
import {getCurrentToken} from "girder/auth";
import OpenSeadragon from 'openseadragon'
import './overlay/osdSvgOverlay';
import connect from "react-redux/es/connect/connect";
import {
    addAnnotation,
    lockAnnotation,
    setSaveStatus,
    unlockAnnotation,
    updateAnnotation
} from "../control/controlActions";
import Polygon from "./overlay/polygon";
import Line from "./overlay/line";
import ToolBar from "../control/ToolBar";
import SaveIndicator from "../control/SaveIndicator";
import Divider from "@material-ui/core/Divider";
import Brush from "./overlay/brush";
import Eraser from "./overlay/eraser";

// helper function to load image using promises
function loadImage(src) {
    return new Promise(function (resolve, reject) {
        let img = document.createElement('img');
        img.addEventListener('load', function () {
            resolve(img)
        });
        img.addEventListener('error', function (err) {
            reject(404)
        });
        img.src = src;
    });
}

class ImageViewerP extends React.Component {

    constructor(props) {
        super(props);
        this.viewer = null;
        this.activePolygon = null;
        this.polygons = [];
        this.brushes = [];
        this.lines = [];
        this.erasers = [];
        this.zoom = 1;
        this.State = Object.freeze({"Edit": 1, "AddingPoly": 2, "Empty": 3});
        this.drawState = this.State.Empty;
        this.id = 'ocd-viewer';
        this.inDrag = false;
        this.setPan(true);
    }

    render() {

        return (
            <div className={"image-viewer"}>
                <div className={"iv-header"} style={{display: this.props.showHeader ? "flex" : "none"}}>
                    <div className={"title"}>{this.props.title}</div>
                    <SaveIndicator/>
                </div>
                <Divider/>
                <ToolBar/>
                <Divider/>
                <div className={"gap1em"}/>

                <div className="ocd-div" ref={node => {
                    this.el = node;
                }}>
                    <div className="navigator-wrapper c-shadow">
                        <div id="navigator"/>
                    </div>
                    <div className="openseadragon" id={this.id}/>
                </div>
            </div>
        )
    }

    initSeaDragon() {
        this.viewer = new OpenSeadragon({
                                            id: this.id,
                                            visibilityRatio: 1,
                                            constrainDuringPan: false,
                                            defaultZoomLevel: 0,
                                            zoomPerClick: 1,
                                            minZoomLevel: 0,
                                            maxZoomLevel: 40,
                                            zoomInButton: 'zoom-in',
                                            zoomOutButton: 'zoom-out',
                                            homeButton: 'reset',
                                            fullPageButton: 'full-page',
                                            nextButton: 'next',
                                            previousButton: 'previous',
                                            showNavigator: true,
                                            navigatorId: 'navigator',
                                        });
        this.onViewerReady();
    }

    onViewerReady() {

        this.svgOverlay = this.viewer.svgOverlay();

        let onClick = this.onClick.bind(this);
        let onZoom = this.onZoom.bind(this);
        this.viewer.addHandler('canvas-click', onClick);
        this.viewer.addHandler('canvas-drag', (event) => {
            event.preventDefaultAction =
                (this.activePolygon || this.activeLine || this.activeBrush || this.activeEraser);
            this.onDrag(event);
        });

        this.viewer.addHandler('canvas-exit', (event) => {
            this.onCanvasExit(event);
        });

        this.viewer.addHandler('canvas-enter', (event) => {
            this.onCanvasEnter(event);
        });

        this.viewer.addHandler('canvas-drag-end', (event) => {
            this.onDragEnd(event);
        });

        this.viewer.addHandler('zoom', onZoom);
        this.moveTracker = new OpenSeadragon.MouseTracker({
                                                              element: this.viewer.container,
                                                              moveHandler: (event) => {
                                                                  //event.preventDefaultAction = true;
                                                                  this.onMove(event);
                                                              }
                                                          });
        //this.moveTracker.setTracking(true);
        let onEsc = this.onEsc.bind(this);
        document.addEventListener("keydown", onEsc, false);

    }

    onEsc() {
        if (this.activePolygon) {
            this.activePolygon.end();
            this.props.lockPolygon(this.activePolygon.label_id, this.activePolygon.poly_id);
            this.activePolygon = null;
        }
    }

    onCanvasEnter(event) {

        if (this.activePolygon) {
            this.activePolygon.onEnter();
        }

        if (this.activeBrush) {
            this.activeBrush.onEnter();
        }
        if (this.activeEraser) {
            this.activeEraser.onEnter();
        }
    }

    onCanvasExit(event) {

        if (this.activePolygon) {
            this.activePolygon.onExit();
        }

        if (this.activeBrush) {
            this.activeBrush.onExit();
        }
        if (this.activeEraser) {
            this.activeEraser.onExit();
        }
    }

    onMove(event) {
        // we dont want to process move if the viewer is currently being dragged.
        let webPoint = event.position;
        let viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);
        let imagePoint = this.viewer.viewport.viewportToImageCoordinates(viewportPoint);
        let zoom = this.viewer.viewport.getZoom(true);
        let imageZoom = this.viewer.viewport.viewportToImageZoom(zoom);

        if (this.activePolygon) {
            this.activePolygon.onMouseMove(viewportPoint);
        }

        if (this.activeBrush) {
            this.activeBrush.onMouseMove(viewportPoint);
        }

        if (this.activeEraser) {
            this.activeEraser.onMouseMove(viewportPoint);
        }

    }

    open_slide(url, mpp) {
        let tile_source;

        // DZI XML fetched from server (deepzoom_server.py)
        tile_source = url;
        this.viewer.open(tile_source);
    }

    setPan(value) {
        this.pan = value;
    }


    onDrag(event) {
        // The canvas-click event gives us a position in web coordinates.
        let webPoint = event.position;

        // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
        let viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);

        // Convert from viewport coordinates to image coordinates.
        let imagePoint = this.viewer.viewport.viewportToImageCoordinates(viewportPoint);

        if (this.activeLine && this.activeLine.drawState) {
            switch (this.activeLine.drawState) {
                case "create":
                    this.activeLine.appendDot(viewportPoint);
                    this.props.updateLine(this.activeLine.labelId, this.activeLine.lineId,
                                          this.activeLine.getImagePoints());
                    break;
            }
        }

        if (this.activeBrush) {
            let isDragSuccessful = this.activeBrush.onMouseDrag(viewportPoint);
        }

        if (this.activeEraser) {
            let isDragSuccessful = this.activeEraser.onMouseDrag(viewportPoint);
        }

    }

    onDragEnd(event) {
        if (this.activeBrush) {
            this.activeBrush.onMouseDragEnd();
            this.props.addNewStroke("brush", this.activeBrush.label.id, this.activeBrush.id, this.activeBrush.brushSize,
                                    this.activeBrush.getImagePoints());
            this.brushes.push(this.activeBrush);
            this.activeBrush = null;
        }
        if (this.activeEraser) {
            this.activeEraser.onMouseDragEnd();
            this.props.addNewStroke("eraser", this.activeEraser.label.id, this.activeEraser.id, this.activeEraser.size,
                                    this.activeEraser.getImagePoints());
            this.erasers.push(this.activeEraser);
            this.activeEraser = null;
        }
    }

    onClick(event) {
        //we dont want to process a click if the viewer is currently being dragged.
        console.log("quick: " + event.quick);
        if (event.quick) {
            // The canvas-click event gives us a position in web coordinates.
            let webPoint = event.position;

            // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
            let viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);

            // Convert from viewport coordinates to image coordinates.
            let imagePoint = this.viewer.viewport.viewportToImageCoordinates(viewportPoint);

            if (this.activePolygon && this.activePolygon.drawState) {
                this.activePolygon.onSelect(viewportPoint);
            }

            // Show the results.
            console.log(webPoint.toString(), viewportPoint.toString(), imagePoint.toString());
        }
    }

    onZoom(event) {
        this.zoom = event.zoom;
        for (let polygon of this.polygons) {
            console.log(event.zoom);
            polygon.onZoom(event);
        }
        if (this.activePolygon) {
            this.activePolygon.onZoom(event);
        }
    }

    deleteAllAnnotations() {
        let annotations = [this.polygons, this.lines, this.brushes];
        for (let annList of annotations) {
            for (let ann of annList) {
                ann.delete();
            }
        }
        annotations = [];
        this.lines = [];
        this.polygons = [];
        this.brushes = [];
        // delete active brushes.
        let strokes = [this.activeBrush, this.activeEraser];
        for (let stroke of strokes) {
            if (stroke) {
                stroke.delete();
            }
        }

        if (this.activePolygon)
            this.activePolygon.delete();
        if (this.activeLine)
            this.activeLine.delete();
        if (this.activeBrush)
            this.activeBrush.delete();
        if (this.activeEraser)
            this.activeEraser.delete();

        this.activePolygon = null;
        this.activeBrush = null;
        this.activeEraser = null;
        this.activeLine = null;
    }

    setActiveTool(activeTool, activeLabel) {
        switch (activeTool) {
            case "eraser":
                this.activeEraser = new Eraser(this.svgOverlay,
                                               this.viewer,
                                               activeLabel,
                                               activeLabel.erasers.length,
                                               this.props.toolRadius,
                                               this.zoom);
                break;
            case "brush":
                this.activeBrush = new Brush(this.svgOverlay,
                                             this.viewer,
                                             activeLabel,
                                             activeLabel.brushes.length,
                                             this.props.toolRadius,
                                             this.zoom);
                break;
            case "line":
                this.activeLine = new Line(this.svgOverlay,
                                           this.viewer,
                                           activeLabel,
                                           activeLabel.lines.length,  // TODO pass the label datastructure directly
                                           this.zoom);
                break;
            case "poly":
                let poly_id = activeLabel.polygons.length;
                this.activePolygon = new Polygon(this.svgOverlay,
                                                 this.viewer,
                                                 activeLabel,
                                                 "create",
                                                 poly_id,  // TODO pass the label datastructure directly
                                                 this.zoom, this.props.addPolygon);
                break;
        }
    }


    updateOverlay() {

        this.deleteAllAnnotations();

        if (this.props.activeLabel) {
            this.setActiveTool(this.props.activeTool, this.props.activeLabel);
        }


        for (let eraser of this.props.erasers) {
            let eraserObj =
                new Eraser(this.svgOverlay, this.viewer, eraser.label, eraser.id,
                           this.props.toolRadius, this.zoom);
            eraserObj.addImagePoints(eraser.points);
            this.erasers.push(eraserObj);
        }

        for (let brush of this.props.brushes) {
            let brushObj = new Brush(this.svgOverlay, this.viewer, brush.label, brush.id, brush.brush_radius,
                                     this.zoom);
            brushObj.addImagePoints(brush.points);
            this.brushes.push(brushObj);
        }

        //create polygons from props
        for (let polygon of this.props.polygons) {
            let polyObj = new Polygon(this.svgOverlay, this.viewer, polygon.label, "read_only", polygon.poly_id,
                                      this.zoom, this.props.addPolygon);
            polyObj.addImagePoints(polygon.points);
            this.polygons.push(polyObj);
        }

        for (let line of this.props.lines) {
            let lineObj = new Line(this.svgOverlay, this.viewer, line.label_id, line.line_id, this.zoom);
            lineObj.addImagePoints(line.points);
            this.lines.push(lineObj);
        }

    }

    componentDidMount() {
        this.initSeaDragon();

    }

    getSnapshotBeforeUpdate(prevProps) {
        if (prevProps.dbId !== this.props.dbId) {
            if (this.props.mimeType === "application/octet-stream") {
                let dziPath = "api/v1/image/dzi/" + this.props.dbId;
                this.open_slide(dziPath, 0.2505);
            } else {
                let imagePath = "api/v1/image/" + this.props.dbId;
                this.viewer.open({
                                     type: 'image',
                                     url: imagePath,
                                     buildPyramid: false
                                 });
            }
            this.updateOverlay = this.updateOverlay.bind(this);
            this.viewer.addOnceHandler('open', this.updateOverlay);
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.updateOverlay();
    }

}

// ---------- Container ----------
function mapLabelsToAnns(labels) {
    let polygons = [];
    let lines = [];
    let brushes = [];
    let erasers = [];
    for (let label of labels) {
        let newPolygons = label.polygons.map((poly) => {
            let newPoly = Object.assign({}, poly);
            newPoly.label = label;
            newPoly.poly_id = poly.id;
            return newPoly;
        });
        let newLines = label.lines.map((line) => {
            let newLine = Object.assign({}, line);
            newLine.label_id = label.id;
            newLine.line_id = line.id;
            return newLine;
        });
        let newBrushes = label.brushes.map((brush) => {
            let newBrush = Object.assign({}, brush);
            newBrush.label = label;
            newBrush.id = brush.id;
            return newBrush;
        });
        let newErasers = label.erasers.map((eraser) => {
            let newEraser = Object.assign({}, eraser);
            newEraser.label = label;
            newEraser.eraser_id = eraser.id;
            return newEraser;
        });
        lines = lines.concat(newLines);
        polygons = polygons.concat(newPolygons);
        brushes = brushes.concat(newBrushes);
        erasers = erasers.concat(newErasers);
    }
    return {lines, polygons, brushes, erasers};
}

function getActiveImageInfo(images) {
    let dbId = "";
    let mimeType = "";
    let title = "Untitled";

    for (let image of images) {
        if (image.active) {
            title = image.title;
            mimeType = image.mimeType;
            dbId = image.dbId;
            break;
        }
    }
    return {dbId, mimeType, title}
}

function getActiveLabel(labels) {
    for (let label of labels) {
        if (label.active) {
            return label;
        }
    }
    return null;
}

function getToolRadius(tools, activeTool) {
    if (activeTool !== "" && tools[activeTool]) {
        return tools[activeTool].size || 10;
    }
}

function mapStateToProps(state) {


    let {dbId, mimeType, title} = getActiveImageInfo(state.images);
    let {lines, polygons, brushes, erasers} = mapLabelsToAnns(state.labels);
    let activeLabel = getActiveLabel(state.labels);
    let toolRadius = getToolRadius(state.tools, state.rightBar);
    return {
        showHeader: state.showHeader,
        title: title,
        mimeType: mimeType,
        dbId: dbId,
        activeLabel: activeLabel,
        toolRadius: toolRadius,
        activeTool: state.rightBar,
        polygons: polygons,
        lines: lines,
        brushes: brushes,
        erasers: erasers
    };
}

function mapDispatchToProps(dispatch) {
    return {
        addPolygon: (label_id, poly_id, points) => {
            dispatch(addAnnotation("polygon", label_id));
            dispatch(updateAnnotation("polygon", label_id, poly_id, points));
            dispatch(lockAnnotation("polygon", label_id, poly_id));
            dispatch(setSaveStatus("dirty"));
        },
        updatePolygon: (label_id, poly_id, points) => {
            dispatch(updateAnnotation("polygon", label_id, poly_id, points));
        },
        lockPolygon: (label_id, poly_id) => {
            dispatch(lockAnnotation("polygon", label_id, poly_id));
            dispatch(setSaveStatus("dirty"));
        },
        updateLine: (label_id, line_id, points) => {
            dispatch(updateAnnotation("line", label_id, line_id, points));
        },
        lockLine: (label_id, line_id) => {
            dispatch(lockAnnotation("line", label_id, line_id));
            dispatch(setSaveStatus("dirty"));
        },
        addNewStroke: (ann_type, label_id, brush_id, brush_radius, points) => {
            dispatch(addAnnotation(ann_type, label_id, {"brush_radius": brush_radius}));
            dispatch(updateAnnotation(ann_type, label_id, brush_id, points, {"brush_radius": brush_radius}));
            dispatch(lockAnnotation(ann_type, label_id, brush_id));
            dispatch(setSaveStatus("dirty"));
        }
    };
}

const ImageViewer = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ImageViewerP);

export default ImageViewer;


