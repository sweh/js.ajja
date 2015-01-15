import glob
import gocept.jslint
import gocept.testing.mtime
import os
import pkg_resources
import unittest


RESOURCES_DIR = pkg_resources.resource_filename('gocept.jsform', 'resources')
MAKEFILE_DIR = os.getcwd()


class TestMinifiedJSFiles(unittest.TestCase, gocept.testing.mtime.Newer):

    source_ext = '.js'
    target_ext = '.min.js'
    message = '\nRun `make` in %s to fix this.' % MAKEFILE_DIR
    delta = 7  # time delta for jenkins needs to be higher than default.

    def test_minified_js_files_are_younger_than_non_minified_ones(self):
        self.check_files(RESOURCES_DIR)


class TestJSLint(gocept.jslint.TestCase):

    jshint_command = os.environ.get('JSHINT_COMMAND', '/bin/true')
    include = ['gocept.jsform:resources']
    exclude = (['ko.mapping.js', 'json-template.js'] +
               [os.path.basename(x) for x in glob.glob(
                pkg_resources.resource_filename(
                    'gocept.jsform', 'resources/*.min.js'))
                ])
