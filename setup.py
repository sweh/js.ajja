# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

# This should be only one line. If it must be multi-line, indent the second
# line onwards to keep the PKG-INFO file format intact.
"""Next generation forms in javascript
"""

from setuptools import setup, find_packages
import glob
import os.path


def project_path(*names):
    return os.path.join(os.path.dirname(__file__), *names)


setup(
    name='gocept.jsform',
    version='2.2.0',

    install_requires=[
        'fanstatic>=1.0a2',
        'js.classy',
        'js.jquery',
        'js.handlebars',
        'js.knockout>=3.1.0',
        'cssmin',
        'setuptools',
    ],

    extras_require={
        'test': [
            'gocept.jasmine>=0.3',
            'gocept.jslint',
            'gocept.testing',
        ],
    },

    entry_points={
        'console_scripts': [
            # 'binary-name = gocept.jsform.module:function'
        ],
        'fanstatic.libraries': [
            'gocept.jsform = gocept.jsform.resource:library',
        ],
    },

    author=('Sebastian Wehrmann <sw@gocept.com>, '
            'Maik Derstappen <md@derico.de>'),
    author_email='sw@gocept.com',
    license='ZPL 2.1',
    url='https://bitbucket.org/gocept/gocept.jsform/',

    keywords='form javascript jquery client',
    classifiers="""\
License :: OSI Approved :: Zope Public License
Programming Language :: Python
Programming Language :: Python :: 2
Programming Language :: Python :: 2.6
Programming Language :: Python :: 2.7
Programming Language :: Python :: 2 :: Only
"""[:-1].split('\n'),
    description=__doc__.strip(),
    long_description='\n\n'.join(open(project_path(name)).read() for name in (
        'src/gocept/jsform/resources/README.md',
        'README.txt',
        'HACKING.txt',
        'CHANGES.txt',
    )),

    namespace_packages=['gocept'],
    packages=find_packages('src'),
    package_dir={'': 'src'},
    include_package_data=True,
    data_files=[('', glob.glob(project_path('*.txt')))],
    zip_safe=False,
)
