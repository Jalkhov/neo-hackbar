@echo off
set VER=0.1

sed -i -E "s/version>.+?</version>%VER%</" install.rdf
sed -i -E "s/version>.+?</version>%VER%</; s/download\/.+?\/fb-chat-deleter-.+?\.xpi/download\/%VER%\/fb-chat-deleter-%VER%\.xpi/" update.xml

set XPI=fb-chat-deleter-%VER%.xpi
if exist %XPI% del %XPI%
zip -r9q %XPI% * -x .git/* .gitignore update.xml LICENSE README.md *.cmd *.xpi *.exe
