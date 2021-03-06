import json
import traceback
from io import BytesIO, StringIO

import cherrypy
from bson.json_util import dumps

from girder.api import access, rest
from girder.api.describe import autoDescribeRoute, Description
from girder.api.rest import Resource, setCurrentUser
from girder.constants import AccessType
from girder.models.assetstore import Assetstore
from girder.models.collection import Collection
from girder.models.file import File
from girder.models.folder import Folder
from girder.models.item import Item
from girder.models.upload import Upload
from girder.models.user import User
from girder.utility import RequestBodyStream

from ..error import errorMessage
from ..bcolors import printOk, printFail, printOk2


class AssignmentResource(Resource):
    def __init__(self):
        super().__init__()

        self.coll_m = Collection()
        self.file_m = File()
        self.folder_m = Folder()
        self.item_m = Item()
        self.upload_m = Upload()
        self.asset_m = Assetstore()
        self.user_m = User()

        self.setupRoutes()

    def setupRoutes(self):
        self.route('GET', (), handler=self.list)
        self.route('GET', (':a_id',), handler=self.getAssignment)
        self.route('GET', ('admin_data',), handler=self.getAdminData)

    def __findName(self, folder):
        imageFolder = self.__findImageFolder(folder)
        if isinstance(imageFolder, dict):
            return imageFolder['name']

        return ""

    def __findImageFolder(self, folder):
        owner = self.__findOwner(folder)
        ret = ""
        if self.folder_m.getAccessLevel(folder, self.getCurrentUser()) == AccessType.ADMIN:
            # this folder was created by this user, and so it will contain the images
            # printFail(folder)
            ret = folder
        else:
            meta = folder['meta']
            # this is the label file, and so should only have one entry in the metadata
            assert len(meta) == 1
            # that one entry contains link to the image folder, key must be the creator of this folder
            assert str(owner['_id']) in meta, (str(owner['_id']), meta)

            ret = self.folder_m.load(meta[str(owner['_id'])],
                                     level=AccessType.READ,
                                     user=self.getCurrentUser())

        return ret

    def __findLabelFolder(self, folder):
        owner = self.__findOwner(folder)
        ret = []
        if self.folder_m.getAccessLevel(folder, self.getCurrentUser()) == AccessType.ADMIN:
            # this folder was created by this user, so it will contain images
            if 'meta' not in folder:
                return []

            meta = folder['meta']
            for k, v in meta.items():
                ret.append(self.folder_m.load(v, level=AccessType.READ, user=self.getCurrentUser()))
        else:
            # this folder was not created by this user, so it will contain labels
            ret = [folder]

        return ret

    def __findOwner(self, folder):
        aclList = Folder().getFullAccessList(folder)
        for acl in aclList['users']:
            if acl['level'] == AccessType.ADMIN:
                return self.user_m.load(str(acl['id']), level=AccessType.READ, user=self.getCurrentUser())
        return None

    @access.public
    @autoDescribeRoute(
        Description('Get list of all assignments that it owns or is a part of')
            .param('limit', 'Number of assignments to return')
            .param('offset', 'offset from 0th assignment to start looking for assignments'))
    @rest.rawResponse
    def list(self, limit, offset):
        try:
            printOk((limit, offset))
            ret = self.__list(int(limit), int(offset))
            cherrypy.response.headers["Content-Type"] = "application/json"
            return dumps(ret)

        except:
            printFail(traceback.print_exc)

    def __list(self, limit=0, offset=0):
        user = self.getCurrentUser()
        folders = self.folder_m.find({'parentId': user['_id'],
                                      'parentCollection': 'user'}, limit=limit, offset=offset)
        ret = []
        for folder in folders:
            if self.__findName(folder):
                ret.append({'name': self.__findName(folder),
                            'image_folder': self.__findImageFolder(folder),
                            'label_folders': self.__findLabelFolder(folder),
                            'owner': self.__findOwner(folder)})

        return ret

    def __getAssignment(self, _id):
        assignments = self.__list()
        for assignment in assignments:
            # printOk2(assignment)
            if str(assignment['image_folder']['_id']) == _id:
                return assignment

        return None

    def __getAnnotators(self, assignment):
        ret = []
        for label_folder in assignment['label_folders']:
            printOk(label_folder)
            ret.append({
                'user': self.user_m.load(label_folder['parentId'], user=self.getCurrentUser(), level=AccessType.READ),
                'expanded': False,
            })

        return ret

    @access.public
    @autoDescribeRoute(
        Description('Get assignment by id').param('a_id', 'folder id that controls the assignment'))
    @rest.rawResponse
    def getAssignment(self, a_id):
        try:
            assignment = self.__getAssignment(a_id)
            return dumps(assignment)
        except:
            printFail(traceback.print_exc)

    @access.public
    @autoDescribeRoute(
        Description('Get admin data associated with assignment id').param('a_id',
                                                                          'folder id that controls the assignment'))
    @rest.rawResponse
    def getAdminData(self, a_id):
        try:
            assignment = self.__getAssignment(a_id)
            if assignment['owner']['_id'] == self.getCurrentUser()['_id']:
                # then current user is this assignment's admin
                return dumps({'annotators': self.__getAnnotators(assignment)})

        except:
            printFail(traceback.print_exc)
