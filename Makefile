JS_COMPILER = \
	java -jar /Library/Google/Compiler/compiler-20100201.jar \
	--charset UTF-8

SRC_FILES = \
	src/start.js \
	src/ns.js \
	src/dispatch.js \
	src/select.js \
	src/map.js \
	src/ease.js \
	src/end.js

all: epheme.js epheme.min.js

epheme.min.js: epheme.js Makefile
	rm -f $@
	$(JS_COMPILER) < epheme.js >> $@

epheme.js: $(SRC_FILES) Makefile
	rm -f $@
	cat $(SRC_FILES) >> $@
	chmod a-w $@

clean:
	rm epheme.js epheme.min.js
