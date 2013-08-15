# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

import fanstatic


MINIFIERS = {'.js': 'jsmin'}


library = fanstatic.Library(
    'gocept.jsform.tests', 'resources', minifiers=MINIFIERS)

jasmine_css = fanstatic.Resource(library, 'jasmine.css')

jasmine_js = fanstatic.Resource(
    library, 'jasmine.js', depends=[jasmine_css])

jasmine = fanstatic.Resource(library, 'jasmine-html.js', depends=[jasmine_js])

setup = fanstatic.Resource(
    library, 'setup_jasmine.js', depends=[jasmine], bottom=False)

integration = fanstatic.Resource(library, 'integration.js', depends=[setup])
