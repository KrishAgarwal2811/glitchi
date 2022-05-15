import { pageView, select } from "#libs";
import {Command} from "Interfaces";

export  const command: Command = {
  name: "addemoji",
  aliases: ["ae","adde"],
  description: "adds emoji",
  requiredPerms: ["MANAGE_EMOJIS_AND_STICKERS"],
  userPerms: ["MANAGE_EMOJIS_AND_STICKERS"],
  usage: "?<name> ?<url> ?--name=<emojiName>",

  async run({msg,args}){
    let emojiName: undefined|string;
    let emojiUrl: undefined|string;
    const emojiNameOverride = args.find((e,i)=>e.startsWith("--name=")&&args.splice(i,1))?.replace("--name=","");

    // from referenced message
    if(!args.length && msg.reference?.messageId && emojiNameOverride){
      const refMsg = await msg.channel.messages.fetch(msg.reference.messageId).catch(()=>undefined);
      if(!refMsg)return msg.reply("Unable to resolve referenced Message.");
      const reg = /https\:\/\/\S+/g;
      const ereg = /<(a)?:(\w{1,20}):(\d{1,32})>/g;

      // from referenced message content
      if(refMsg.content?.length){
        // search for emojis
        if(new RegExp(ereg).test(refMsg.content)){
          const matches = [...refMsg.content.matchAll(ereg)];
          emojiUrl = await select(
            msg,
            {
              title: "Select Emoji",
              options: matches.map((m)=>({
                label: m[2], 
                value: `https://cdn.discordapp.com/emojis/${m[3]}.${m[1]?"gif":"png"}`,
                emoji: m[0]
              }))
            }
          ).catch(()=>undefined);
        }
        // search for urls
        else if(new RegExp(reg).test(refMsg.content)){
          const matches = [...refMsg.content.matchAll(reg)];
          if(matches.length>1)emojiUrl = await select(
            msg,
            {
              title: "Select URL",
              options: matches.map((m,i)=>({
                label: m[0], 
                value: m[0],
                description: `Matched URL at ${i}`
              }))
            }
          ).catch(()=>undefined);
          else emojiUrl = matches[0][0];
        }
      }
      // from referenced message embed url
      else if(refMsg.embeds[0].url)emojiUrl=refMsg.embeds[0].url
    }

    // from args
    else if(args[0] && args[1]){
      [emojiName,emojiUrl] = args;
    }

    // from attachments
    else if(args[0] && msg.attachments.size){
      emojiName= args[0],
      emojiUrl= msg.attachments.first()?.url
    }
    
    //set if has nane override
    if(emojiNameOverride)emojiName=emojiNameOverride;

    // if dosen't matches specs suggest user to get help
    if(!(emojiName&&emojiUrl)) return msg.reply({
      content: `Get Help! Use \`${msg.client.config.prefix}help addemoji\` to get help on it.`,
      allowedMentions: {repliedUser:false}
    });
    
    // add Emoji
    msg.guild?.emojis.create(emojiUrl,emojiName,{
      reason: `requested by ${msg.author.tag}`
    }).then((e)=>{
      msg.reply({
        allowedMentions:{repliedUser:false},
        content: `Successfully added emoji ${e} with name ${e.name}.`
      })
    }).catch((e)=>{
      new pageView(msg,e.message,{code:"js",title:"ERROR"});
    });
  }
}