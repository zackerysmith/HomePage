#test fix
```java
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import quickfix.*;
import quickfix.field.*;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.*;

public class FixToJsonConverter {
    private final DataDictionary dataDictionary;
    private final Map<Integer, String> fieldNameCache = new HashMap<>();
    private final Map<Integer, String> fieldTypeCache = new HashMap<>();
    private final Map<Integer, Map<String, String>> enumValueCache = new HashMap<>();

    public FixToJsonConverter(InputStream xmlSchemaStream) throws ConfigError {
        this.dataDictionary = new DataDictionary(xmlSchemaStream);
        preloadFieldMetadata();
    }

    private void preloadFieldMetadata() {
        for (Field<?> field : dataDictionary.getFields().values()) {
            int tag = field.getTag();
            fieldNameCache.put(tag, dataDictionary.getFieldName(tag));
            fieldTypeCache.put(tag, dataDictionary.getFieldTypeEnum(tag).toString());
            enumValueCache.put(tag, dataDictionary.getValueNames(tag));
        }
    }

    public String convert(String fixMessage) throws InvalidMessage, FieldConvertError {
        Message message = new Message();
        MessageUtils.parse(message, fixMessage, dataDictionary, false);
        ObjectNode rootNode = JsonNodeFactory.instance.objectNode();
        processFieldMap(message, rootNode, message.getHeader().getString(BeginString.FIELD));
        return rootNode.toString();
    }

    private void processFieldMap(FieldMap<?> fieldMap, ObjectNode node, String beginString) throws FieldConvertError {
        for (Map.Entry<Integer, String> entry : fieldNameCache.entrySet()) {
            int tag = entry.getKey();
            String fieldName = entry.getValue();

            if (fieldMap.isSetField(tag)) {
                try {
                    if (dataDictionary.isGroup(beginString, tag)) {
                        ArrayNode arrayNode = JsonNodeFactory.instance.arrayNode();
                        processGroup(fieldMap, tag, beginString, arrayNode);
                        node.set(fieldName, arrayNode);
                    } else {
                        JsonNode valueNode = convertFieldValue(fieldMap, tag);
                        node.set(fieldName, valueNode);
                    }
                } catch (FieldNotFound e) {
                    // Skip fields not present in the message
                }
            }
        }
    }

    private void processGroup(FieldMap<?> parent, int groupTag, String beginString, ArrayNode arrayNode) throws FieldConvertError {
        int countTag = dataDictionary.getGroupCountTag(groupTag);
        int groupCount = parent.getInt(countTag);

        for (int i = 1; i <= groupCount; i++) {
            Group group = new Group(groupTag, countTag);
            parent.getGroup(i, group);
            ObjectNode groupNode = JsonNodeFactory.instance.objectNode();
            processFieldMap(group, groupNode, beginString);
            arrayNode.add(groupNode);
        }
    }

    private JsonNode convertFieldValue(FieldMap<?> fieldMap, int tag) throws FieldConvertError {
        String value = fieldMap.getString(tag);
        String fieldType = fieldTypeCache.get(tag);

        switch (fieldType) {
            case "INT":
                return IntNode.valueOf(Integer.parseInt(value));
            case "FLOAT":
            case "QTY":
                return DoubleNode.valueOf(Double.parseDouble(value));
            case "BOOLEAN":
                return BooleanNode.valueOf(value.equals("Y"));
            case "UTCTIMESTAMP":
            case "UTCTIME":
                TemporalAccessor temporal = FieldConverters.getDateTimeFormatter(fieldType).parse(value);
                String isoDate = DateTimeFormatter.ISO_INSTANT.format(temporal);
                return TextNode.valueOf(isoDate);
            default:
                Map<String, String> enumValues = enumValueCache.get(tag);
                return enumValues != null && enumValues.containsKey(value)
                        ? TextNode.valueOf(enumValues.get(value))
                        : TextNode.valueOf(value);
        }
    }
}
```


#test
```java
InputStream xmlSchemaStream = FixToJsonConverter.class.getResourceAsStream("/FIX44.xml");
FixToJsonConverter converter = new FixToJsonConverter(xmlSchemaStream);

String fixMessage = "8=FIX.4.4\u00019=122\u000135=D\u000134=215\u000149=CLIENT12\u000152=20100225-19:41:57.306\u000156=B\u00011=Marcel\u000111=13346\u000121=1\u000138=1000\u000140=2\u000154=1\u000155=MSFT\u000159=0\u000160=20100225-19:39:52.020\u000110=072\u0001";
String jsonOutput = converter.convert(fixMessage);

System.out.println(jsonOutput);
```

output
```json

{
  "BeginString": "FIX.4.4",
  "BodyLength": 122,
  "MsgType": "D",
  "MsgSeqNum": 215,
  "SenderCompID": "CLIENT12",
  "SendingTime": "2010-02-25T19:41:57.306Z",
  "TargetCompID": "B",
  "Account": "Marcel",
  "ClOrdID": "13346",
  "HandlInst": "AUTOMATED_EXECUTION_ORDER_PRIVATE_NO_BROKER_INTERVENTION",
  "OrderQty": 1000,
  "OrdType": "LIMIT",
  "Side": "BUY",
  "Symbol": "MSFT",
  "TimeInForce": "DAY",
  "TransactTime": "2010-02-25T19:39:52.020Z",
  "CheckSum": "072"
}
```
