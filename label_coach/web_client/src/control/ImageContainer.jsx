import * as React from "react";
import "../styles/ImageContainer.css"
import {connect} from "react-redux";
import ThumbnailP from "./Thumbnail";

class ImageContainerP extends React.Component {
    constructor(props) {
        super(props);

    }

    render() {
        let rows = [];
        if (this.props.images.length > 0) {
            this.props.images.forEach((image, i) => {
                rows.push(
                    <ThumbnailP key={image.id} id={image.id} active={image.active} title={image.title}
                                resPath={image.getThumbnail}/>
                );
            });
        }
        return (
            <ul className="image-container">
                {rows}
            </ul>
        );
    }
}

// ---------- Container ----------

function getSearchLabels(images, searchTerm){
    return images.filter(image => image.title.match(searchTerm));
}

function mapStateToProps(state) {
    return{
        images: getSearchLabels(state.images, state.searchImages)
    }
}

function mapDispatchToProps(dispatch) {
    return {};
}

const ImageContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(ImageContainerP);

export default ImageContainer;