"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import "filepond/dist/filepond.min.css";
import { FilePond, registerPlugin } from "react-filepond";

registerPlugin(FilePondPluginFileValidateType);

export const EpubUploader = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Button
        className="bg-indigo-500 text-white shadow-lg"
        color="primary"
        radius="lg"
        onPress={onOpen}
      >
        上传 Epub
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">上传 Epub</ModalHeader>
              <ModalBody>
                <FilePond
                  allowMultiple={true}
                  server="/api/novels"
                  name="files" /* sets the file input name, it's filepond by default */
                  labelIdle='<span class="tracking-wide">拖拽文件或<span class="filepond--label-action">点击</span>上传</span>'
                  acceptedFileTypes={["application/epub"]}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    window.location.reload();
                  }}
                >
                  完成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
