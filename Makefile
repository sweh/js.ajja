existing_min_js_files = $(patsubst %.js,%.min.js, $(wildcard src/ajja/resources/*.min.js) $(wildcard src/ajja/resources/localizations/*.min.js) $(wildcard src/ajja/additional/*.min.js))
min_js_files = $(filter-out $(existing_min_js_files), $(patsubst %.js,%.min.js, $(wildcard src/ajja/resources/*.js) $(wildcard src/ajja/resources/localizations/*.js) $(wildcard src/ajja/additional/*.min.js)))

%.min.js: %.js
	./bin/py -m jsmin $<  > $@

all: $(min_js_files)

clean:
	rm -f $(min_js_files)
