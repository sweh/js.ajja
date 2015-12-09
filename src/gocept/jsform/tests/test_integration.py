# -*- coding: utf-8 -*-
import fanstatic
import gocept.jasmine.jasmine
import gocept.jasmine.resource
import gocept.jsform.resource
import os


library = fanstatic.Library('gocept.jsform.tests', 'resources')
jsform_test = fanstatic.Resource(
    library, 'jsform.js', depends=[
        gocept.jasmine.resource.jasmine,
        gocept.jsform.resource.jsform,
    ])
listwidget_test = fanstatic.Resource(
    library, 'listwidget.js', depends=[
        gocept.jasmine.resource.jasmine,
        gocept.jsform.resource.container_widget,
    ])
groupwidget_test = fanstatic.Resource(
    library, 'groupwidget.js', depends=[
        gocept.jasmine.resource.jasmine,
        gocept.jsform.resource.container_widget,
    ])
tablewidget_test = fanstatic.Resource(
    library, 'tablewidget.js', depends=[
        gocept.jasmine.resource.jasmine,
        gocept.jsform.resource.container_widget,
    ])


# Register this library programmatically to avoid making the package metadata
# depend on test-only dependencies.
fanstatic.get_library_registry().add(library)


class JSFormApp(gocept.jasmine.jasmine.TestApp):

    def need_resources(self):
        jsform_test.need()

    @property
    def body(self):
        return '<div id="my_form"></div>'


class JSFormTestCase(gocept.jasmine.jasmine.TestCase):

    layer = gocept.jasmine.jasmine.get_layer(JSFormApp())
    debug = os.environ.get('JASMINE_DEBUG', False)

    def test_integration(self):
        self.run_jasmine()


class ListWidgetApp(JSFormApp):

    def need_resources(self):
        listwidget_test.need()


class ListWidgetTestCase(JSFormTestCase):

    layer = gocept.jasmine.jasmine.get_layer(ListWidgetApp())


class GroupWidgetApp(JSFormApp):

    def need_resources(self):
        groupwidget_test.need()


class GroupWidgetTestCase(JSFormTestCase):

    layer = gocept.jasmine.jasmine.get_layer(GroupWidgetApp())


class TableWidgetApp(JSFormApp):

    def need_resources(self):
        tablewidget_test.need()


class TableWidgetTestCase(JSFormTestCase):

    layer = gocept.jasmine.jasmine.get_layer(TableWidgetApp())
