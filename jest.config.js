module.exports = {
    "roots": [
        "test"
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "coveragePathIgnorePatterns": ["/node_modules/", "/lib/", "/example/", "/doc/", "/__mocks/"],
    "setupFilesAfterEnv": ["<rootDir>test/setupEnzyme.ts"],
    "moduleNameMapper": {
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
        "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
    },
    "snapshotSerializers": [
        "enzyme-to-json/serializer"
    ],
    "testEnvironment": "jsdom"
};
