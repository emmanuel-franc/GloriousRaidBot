const Discord = require('discord.js')
const USER_ROLES = ['tank', 'heal', 'rogue', 'warlock', 'shaman', 'paladin', 'mage', 'warrior', 'hunter', 'druid', 'priest', 'absence']
const EXCLUDE_ROLES = ['Tank', 'Heal', 'Total', 'Date', 'Time']

module.exports = {
  name: 'event',
  description: 'Event!',
  args: false,
  usage: '<title> <description> <date> <time>',
  execute(message, args) {
    let registeredUsers = {
      totalCount: 0,
    }

    for (const key of USER_ROLES) {
      registeredUsers[key] = [];
    }

    let embedMessage = {}
    const argsByDM = {
      title: '',

    }

    const createEventEmbed = () => ({
      color: '#0099ff',
      title: `${args[0] || argsByDM.title}`,
      description: `${args[1] || argsByDM.description}`,
      fields: [
        {
          name: 'Date',
          value: `${args[2] || argsByDM.date}`,
          inline: true,
        },
        {
          name: 'Time',
          value: `${args[3] || argsByDM.time}`,
          inline: true,
        },
        {
          name: 'Total',
          value: 0,
          inline: true,
        },
        {
          name: 'Tank',
          value: '-',
          inline: true,
        },
        {
          name: 'Heal',
          value: '-',
          inline: true,
        },
      ],
      timestamp: new Date(),
      footer: {
        text: '---------------------------------------------------------------------',
      },
    })

    const initiateEventWithDM = async () => {
      const checkString = response => !!response.content
      const checkDateFormat = response => {
        const reg = /^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)\d{4}$/
        if (response.author.id == message.author.id && !reg.test(response.content)) {
          message.author.send('You proved a wrong date format')
        } else {
          return reg.test(response.content)
        }
      }
      const checkTimeFormat = response => {
        const reg = /(?:[01]\d|2[0123]):(?:[012345]\d)/
        if (response.author.id == message.author.id && !reg.test(response.content)) {
          message.author.send('You proved a wrong time format')
        } else {
          return reg.test(response.content)
        }
      }

      message.author.send('Welcome to the Glorious Raid Event bot')
      try {
        await message.author.send('Please provide a title for your event')
        const getTitle = await message.author.dmChannel.awaitMessages(checkString, { max: 1, time: 60000, errors: ['time'] })
        argsByDM.title = getTitle.first().content

        await message.author.send('Please provide a description for your event')
        const getDescription = await message.author.dmChannel.awaitMessages(checkString, { max: 1, time: 60000, errors: ['time'] })
        argsByDM.description = getDescription.first().content
  
        await message.author.send('Please provide a date matching dd/mm/yyyy for your event')
        const getDate = await message.author.dmChannel.awaitMessages(checkDateFormat, { max: 1, time: 60000, errors: ['time']})
        argsByDM.date = getDate.first().content

        await message.author.send('Please provide a time matching HH:MM for your event')
        const getTime = await message.author.dmChannel.awaitMessages(checkTimeFormat, { max: 1, time: 60000, errors: ['time']})
        argsByDM.time = getTime.first().content

        createEvent()
        
      } catch (e) {
        message.author.send('You took too much time to answer. Stopping the bot.')
      }
    }

    const createEvent = () => {
      message.channel.send({ embed: createEventEmbed() }).then(embed => {
        try {
          message.guild.emojis.cache.map(async item => await embed.react(item.id))
  
          embedMessage = embed
  
          createCollector(message)
        } catch (e) {
          console.log('-----e', e)
          throw new Error('error while bot maps emojis', e)
        }
      })
  
      const createCollector = (message) => {
        const allEmojis =  message.guild.emojis.cache.map(item => item.id);
        const filter = (reaction, user) => {
          return allEmojis.includes(reaction.emoji.id)
        };
  
        const collector = embedMessage.createReactionCollector(filter, {});
    
        collector.on('collect', (reaction, user) => {
          if (user.username !== 'GloriousRaidEvent') {
            fillField(user, reaction._emoji.name)
          }
        })
      }
      const fillField = (user, emojiName) => {
        pushUser(emojiName, user)
  
        const newEmbed = new Discord.MessageEmbed(embedMessage.embeds[0])
  
        newEmbed.fields.forEach((field) => {
          if (!EXCLUDE_ROLES.includes(field.name) || field.name === 'Tank' || field.name === 'Heal') {
            console.log(field.name)
            return field.value = registeredUsers[field.name.toLowerCase()].map(item => `${item.emoji} ${item.user}`).join("\n") || '-'
          } else if (field.name === 'Total'){
            return field.value = registeredUsers.totalCount
          }
        })
  
        newEmbed.fields = newEmbed.fields.filter(field => {
          return field.value !== '-' || EXCLUDE_ROLES.includes(field.name)
        })
  
        embedMessage.edit(newEmbed);
      }
  
      const pushUser = (emojiName, user) => {
        let newRole = ''
  
        if (emojiName.startsWith('tank_')) {
          newRole = 'tank'
        } else if (emojiName.startsWith('heal_')) {
          newRole = 'heal'
        } else if (emojiName.endsWith('_druid')) {
          newRole = 'druid'
        } else if (emojiName.endsWith('_priest')) {
          newRole = 'priest'
        } else if (emojiName.endsWith('_shaman')) {
          newRole = 'shaman'
        } else {
          newRole = emojiName
        }
  
        createField(newRole, embedMessage)
  
        USER_ROLES.forEach(role => {
          if (registeredUsers[role].find(usr => usr.user === user.username) && !EXCLUDE_ROLES.includes(role)) {
            registeredUsers[role].splice(registeredUsers[role].findIndex(usr => usr.user === user.username))
            registeredUsers.totalCount > 0 ? registeredUsers.totalCount -= 1 : 0
          }
        })
  
        const getEmoji =  message.guild.emojis.cache.find(emoji => emoji.name === emojiName);
  
        registeredUsers[newRole].push({emoji: getEmoji, user: user.username})
  
        if (emojiName === 'absence') {
          registeredUsers.totalCount > 0 ? registeredUsers.totalCount -= 1 : 0
        } else {
          registeredUsers.totalCount += 1
        }
      }
  
      const createField = (role) => {
        if(!embedMessage.embeds[0].fields.find(field => field.name.toLowerCase() === role)) {
          role === 'absence' ?
          embedMessage.embeds[0].fields.push({ name: role, value: '-', inline: false}) :
          embedMessage.embeds[0].fields.push({ name: role, value: '-', inline: true})
        }
      }
    }

    initiateEventWithDM()
  }
}