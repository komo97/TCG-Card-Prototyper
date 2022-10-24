import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { cairoVersion, Canvas, createCanvas, Image, loadImage } from 'canvas';
const fs = require("fs");

// Remember to rename these classes and interfaces!

interface CardAttribute {
	name: string;
	x: number;
	y: number;
	styling: string;
	rotation: number;
}

interface CardTemplate {
	name: string;
	background: string;
	attributes: Array<CardAttribute>;
}

interface CardTemplates{
	data : Array<CardTemplate>;
}

const DEFAULT_SETTINGS: CardTemplates = {
	data : []
}

export default class TCGCardPrototyper extends Plugin {
	settings: CardTemplates;

	async onload() {
		await this.loadSettings();

		//This command adds a new template for the cards
		this.addCommand({
			id: 'add-card-template',
			name: 'Add card template',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					const rawData = markdownView.getViewData();
					if(!rawData.includes("```cardTemplate")){
						return false;
					}
					if(!checking){
						const splitData = markdownView?.getViewData().split('\n');
						let jsonDataRaw = "";
						let cardTemplateFound = false;
						for(let i = 0; i < splitData.length; ++i){
							if(!cardTemplateFound && splitData[i] === "```cardTemplate"){
								cardTemplateFound = true;
							}
							else if(cardTemplateFound){
								if(splitData[i] === "```"){
									break;
								}
								jsonDataRaw += splitData[i];
							}
						}
						const jsonData = JSON.parse(jsonDataRaw);
						if(jsonData.name === undefined){
							return true;
						}
						let settingSlot = -1;
						for(let i = 0; i < this.settings.data.length; ++i){
							if(this.settings.data[i].name === jsonData.name){
								settingSlot = i;
							}
						}
						if(settingSlot === -1){
							this.settings.data.push(jsonData);
						}
						else{
							this.settings.data[settingSlot] = jsonData;
						}
						this.saveData(this.settings);
					}
					return true;
				}
			}
		});

		this.registerMarkdownCodeBlockProcessor("card",async (source, el, ctx)=>{
			if(source === "")
				return;
			const table = el.createEl("table");
			const body = table.createEl("tbody");
			const contentRow = body.createEl("tr");
			const cardImgCanvas = createCanvas(700,1050);
			const cardImgCtx = cardImgCanvas.getContext("2d");
			const parsedJson = JSON.parse(source);
			const cardImageType = this.settings.data.find(data => data.name === parsedJson.templateName);

			contentRow.createEl("td", {text: source});
			if(cardImageType === undefined)
				return;
			
			if(parsedJson.art !== undefined && parsedJson.art !== ""){
				const imgfile = this.app.vault.getAbstractFileByPath(parsedJson.art);
				const path = this.app.vault.getResourcePath(imgfile as TFile);
				const cardTemplateArt = await loadImage(path);
				cardImgCtx.drawImage(cardTemplateArt,0,0,700,1050);
			}
			if(cardImageType.background !== undefined && cardImageType.background !== ""){
				const imgfile = this.app.vault.getAbstractFileByPath(cardImageType.background);
				const path = this.app.vault.getResourcePath(imgfile as TFile);
				const cardTemplateArt = await loadImage(path);
				cardImgCtx.drawImage(cardTemplateArt,0,0,700,1050);
			}
			for(let i = 0; i < parsedJson.attributes.length; ++i){
				const attributeType = cardImageType.attributes.find(data => data.name === parsedJson.attributes[i].type);
				if(attributeType !== undefined){
					cardImgCtx.font = attributeType.styling;
					if(attributeType.rotation !== undefined){
						cardImgCtx.translate(attributeType.x,attributeType.y);
						cardImgCtx.rotate(attributeType.rotation * (Math.PI / 180));
						cardImgCtx.translate(-attributeType.x,-attributeType.y);
					}
					cardImgCtx.fillText(parsedJson.attributes[i].text,attributeType.x,attributeType.y);
					if(attributeType.rotation !== undefined){
						cardImgCtx.setTransform(1, 0, 0, 1, 0, 0);
					}
				}
			}
			const imgRow = body.createEl("tr");
			imgRow.createEl("td").createEl("img", {attr: {["src"]:cardImgCanvas.toDataURL()}});
			
		});

	}

	async onunload() {
		await this.saveSettings();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}



