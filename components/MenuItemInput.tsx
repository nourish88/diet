import React from "react";

interface MenuItemInputProps {
  ogunIndex: number;
  itemIndex: number;
  item: { birim: string; miktar: string; besin: string };
  onChange: (
    ogunIndex: number,
    itemIndex: number,
    field: string,
    value: string
  ) => void;
}

const MenuItemInput: React.FC<MenuItemInputProps> = ({
  ogunIndex,
  itemIndex,
  item,
  onChange,
}) => {
  return (
    <div className="flex gap-2">
      <input
        className="border p-1 w-20"
        placeholder="Miktar"
        value={item.miktar}
        onChange={(e) =>
          onChange(ogunIndex, itemIndex, "miktar", e.target.value)
        }
      />
      <input
        className="border p-1 w-20"
        placeholder="Birim"
        value={item.birim}
        onChange={(e) =>
          onChange(ogunIndex, itemIndex, "birim", e.target.value)
        }
      />
      <input
        className="border p-1 flex-1"
        placeholder="Besin"
        value={item.besin}
        onChange={(e) =>
          onChange(ogunIndex, itemIndex, "besin", e.target.value)
        }
      />
    </div>
  );
};

export default MenuItemInput;
