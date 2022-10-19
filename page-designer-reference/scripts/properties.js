const fs = require('fs');
const glob = require('glob');
const console = require('console');

const experiencePath = './cartridges/module_pagedesigner/cartridge/experience/';
const bmResourcesPath = './cartridges/bm_pagedesigner/cartridge/templates/resources/';
const bmStaticPath = './cartridges/bm_pagedesigner/cartridge/static/default/experience/images/';
const components = 'components/';
const pages = 'pages/';

console.log('Starting properties generation');

function loopFiles(subFolder, fileHandler) {
    glob(experiencePath + subFolder + '**/*.json', {}, (er, files) => {
        files.forEach(file => {
            fs.readFile(file, 'utf8', (err, data) => {
                const content = JSON.parse(data);
                fileHandler(content);
            });
        });
    });
}

function handlePages() {
    loopFiles(pages, pageDefinition => {
        const fileName = pageDefinition.id + '.properties';
        const filePath = bmResourcesPath + 'page_' + fileName;
        let propertiesContent = 'name=' + pageDefinition.name + '\n';
        if (pageDefinition.description) {
            propertiesContent += 'description=' + pageDefinition.description + '\n';
        }
        for (var region of pageDefinition.region_definitions) {
            propertiesContent += 'region.' + region.id + '.name=' + region.name + '\n';
        }
        fs.mkdir(bmStaticPath + 'page/' + pageDefinition.id, err => { err; });

        fs.writeFile(filePath, propertiesContent, err => {
            if (err) {
                console.error('\tError on writing file ', err);
            } else {
                console.log('\t' + fileName + ' successfully written');
            }
        });
    });
}

function handleComponents() {
    loopFiles(components, componentDefinition => {
        const fileName = 'component_' + componentDefinition.id + '.properties';
        const filePath = bmResourcesPath + fileName;
        const groupName = 'componentgroup_' + componentDefinition.group + '.properties';
        const groupPath = bmResourcesPath + groupName;

        const groupContent = 'name=' + componentDefinition.group.charAt(0).toUpperCase() + componentDefinition.group.slice(1);

        let propertiesContent = 'name=' + componentDefinition.name + '\n';
        if (componentDefinition.description) {
            propertiesContent += 'description=' + componentDefinition.description + '\n';
        }

        for (var region of componentDefinition.region_definitions) {
            propertiesContent += 'region.' + region.id + '.name=' + region.name + '\n';
        }
        for (var group of componentDefinition.attribute_definition_groups) {
            propertiesContent += 'attribute_definition_group.' + group.id + '.name=' + group.name + '\n';
            if (group.description) {
                propertiesContent += 'attribute_definition_group.' + group.id + '.description=' + group.description + '\n';
            }
            for (var attribute of group.attribute_definitions) {
                propertiesContent += 'attribute_definition.' + attribute.id + '.name=' + attribute.name + '\n';
                if (attribute.description) {
                    propertiesContent += 'attribute_definition.' + attribute.id + '.description=' + attribute.description + '\n';
                }
            }
        }

        fs.mkdir(bmStaticPath + 'component/' + componentDefinition.id, err => { err; });


        fs.writeFile(filePath, propertiesContent, err => {
            if (err) {
                console.error('\tError on writing file ', err);
            } else {
                console.log('\t' + fileName + ' successfully written');
            }
        });

        fs.writeFile(groupPath, groupContent, err => {
            if (err) {
                console.error('\tError on writing file ', err);
            } else {
                console.log('\t' + groupName + ' successfully written');
            }
        });
    });
}

handlePages();
handleComponents();
