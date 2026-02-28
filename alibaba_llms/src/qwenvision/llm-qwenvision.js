module.exports = function(RED) {
    const OpenAI = require('openai').default;
    const marked = require("marked");

    RED.log.info('Loading alibaba-llms qwenvision...')

    function QwenNode(config){
        RED.nodes.createNode(this,config);

        const apiKey = config.apikey;
        const node = this;
        let imageStr = '';

        if(apiKey === ""){
            node.status({
                fill: "yellow",
                shape: "dot",
                text: "API Key is required!"
            })
        }

        const openai = new OpenAI({
                // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx",
                apiKey: apiKey,
                baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
            }
        );

        async function invokeQwen(question){
            const completion = await openai.chat.completions.create({
                model: "qwen-vl-plus",  //模型列表：https://bailian.console.aliyun.com/?spm=5176.30202035.J_5cDGbYTFXDvcuWnwVDdx7.1.60561e71za7X4Z&tab=api#/api/?type=model&url=https%3A%2F%2Fhelp.aliyun.com%2Fdocument_detail%2F2845564.html&renderType=iframe
                messages: [{ 
                    role: "user", 
                    content: [
                        {
                            type: "text",
                            text: question
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageStr
                            }
                        }
                    ] 

                }],
            });
            node.send({
                payload: marked.parse(completion.choices[0].message.content)
            })
        }

        node.on('close', () => {
            node.status({})
        })
        node.on('input', async function(msg){
            
            if(msg?.image && typeof msg.image === 'string' && msg.image !== ""){
                imageStr = msg.image;
            }
            else if(msg?.payload && typeof msg.payload === 'string' && msg.payload !== "" && msg.payload.indexOf('blob') < 0 && imageStr !== ""){
                await invokeQwen(msg.payload);
            }
            else{
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "invalid input"
                });
                setTimeout(() => {
                    node.status({});
                }, 5000)
            }
        })
    }

    RED.nodes.registerType("alibaba-llms QwenVision", QwenNode);

}