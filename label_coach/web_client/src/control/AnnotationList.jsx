import * as React from "react";
import "../styles/AnnotationList.css";
import LineItem from "./LineItem";
import PolygonItem from "./PolygonItem";

export default class AnnotationListP extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let colorClass = "bg-color" + this.props.color;
        let rows = [];
        if (this.props.polygons.length > 0) {
            this.props.polygons
                .slice()
                .reverse()
                .forEach((polygon, i) => {
                    rows.push(<li className="list-group-item"><PolygonItem key={"poly_" + i} label_id={this.props.label_id}
                                           poly_id={polygon.id} text={polygon.text} points={polygon.points}
                                           drawState={polygon.drawState}/></li>);
                });
        }

        if (this.props.lines.length > 0) {
            this.props.lines
                .slice()
                .reverse()
                .forEach((line, i) => {
                    rows.push( <li className="list-group-item"><LineItem key={"line_" + i} label_id={this.props.label_id}
                                        line_id={line.id} text={line.text} points={line.points}
                                        drawState={line.drawState}/></li>);
                });
        }

        return (

            <ul className={"annotations list-group " + colorClass + " active"}>
                {rows}
            </ul>

        );
    }

}